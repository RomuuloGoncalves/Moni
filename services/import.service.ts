import mongoose from "mongoose";
import { accountRepository } from "@/repositories/account.repository";
import { transactionRepository } from "@/repositories/transaction.repository";
import { accountService } from "@/services/account.service";
import { merchantCategoryRuleService } from "@/services/merchant-category-rule.service";
import { normalizeDescription } from "@/lib/import/normalize";
import type { ParsedTransaction } from "@/lib/parsers/types";
import type { AccountType } from "@/models/Account";
import type { TransactionType } from "@/models/Transaction";

const INVESTMENT_ACCOUNT_NAME = "Investimentos";
const INVESTMENT_KEYWORDS = ["RICO", "XP", "ROMULO DA SILVA GONCALVES"];

export interface ImportResult {
  imported: number;
  skipped: number;
}

interface RowClassification {
  type: TransactionType;
  targetAccountName?: string;
  targetAccountType?: AccountType;
  /** For "Dinheiro resgatado": the TRANSFER direction is cofrinho -> import source. */
  reversed?: boolean;
}

function normalizeAccountName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Strips a "No cofrinho X" / "Do cofrinho X" prefix (case-insensitive) to get the cofrinho's own name. */
function extractCofrinhoName(counterparty: string): string {
  return counterparty.replace(/^(no|do)\s+cofrinho\s+/i, "").trim();
}

/**
 * IMP-02 routing: decides whether a parsed row is a normal INCOME/EXPENSE or
 * a TRANSFER to/from an auto-created cofrinho (SAVINGS) or investment
 * (INVESTMENT) account. Applied before any CAT-02 categorization, since
 * TRANSFER rows never carry a categoryId (IMP-02 AC5).
 */
export function classifyPicPayRow(row: ParsedTransaction): RowClassification {
  const rawType = (row.rawType ?? "").toLowerCase();
  const counterparty = row.counterparty ?? "";

  if (rawType.includes("dinheiro guardado")) {
    return {
      type: "TRANSFER",
      targetAccountName: extractCofrinhoName(counterparty),
      targetAccountType: "SAVINGS",
      reversed: false,
    };
  }

  if (rawType.includes("dinheiro resgatado")) {
    return {
      type: "TRANSFER",
      targetAccountName: extractCofrinhoName(counterparty),
      targetAccountType: "SAVINGS",
      reversed: true,
    };
  }

  if (
    rawType.includes("pix enviado") &&
    INVESTMENT_KEYWORDS.some((kw) => counterparty.toUpperCase().includes(kw))
  ) {
    return {
      type: "TRANSFER",
      targetAccountName: INVESTMENT_ACCOUNT_NAME,
      targetAccountType: "INVESTMENT",
      reversed: false,
    };
  }

  return { type: row.amountCents >= 0 ? "INCOME" : "EXPENSE" };
}

/**
 * Idempotent by normalized name: reuses an existing account of this user with
 * the same normalized name (regardless of its stored type) or creates a new
 * one with `accountType` and balance 0.
 */
export async function resolveOrCreateAccountByName(
  userId: string,
  name: string,
  accountType: AccountType,
  session?: mongoose.ClientSession,
  cache?: Map<string, any>
) {
  const normalized = normalizeAccountName(name);
  if (cache && cache.has(normalized)) {
    return cache.get(normalized);
  }
  const existingAccounts = await accountRepository.list(userId);
  const match = existingAccounts.find((a) => normalizeAccountName(a.name) === normalized);
  if (match) {
    if (cache) cache.set(normalized, match);
    return match;
  }
  const created = await accountRepository.create(
    { userId, name: name.trim(), type: accountType, balance: 0 },
    session
  );
  if (cache) cache.set(normalized, created);
  return created;
}

interface PlannedTransaction {
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  date: Date;
  description: string;
  normalizedDescription: string;
}

/**
 * Parses/classifies/dedups/imports a batch of already-parsed rows for
 * `accountId` (the account the file was uploaded against). Returns how many
 * transactions were imported vs. skipped as duplicates (IMP-01 AC3).
 */
export async function importTransactions(
  userId: string,
  accountId: string,
  parsed: ParsedTransaction[]
): Promise<ImportResult> {
  if (parsed.length === 0) {
    return { imported: 0, skipped: 0 };
  }

  const session = await mongoose.startSession();
  try {
    let result: ImportResult = { imported: 0, skipped: 0 };

    await session.withTransaction(async () => {
      const planned: PlannedTransaction[] = [];
      const accountCache = new Map<string, any>();

      for (const row of parsed) {
        const classification = classifyPicPayRow(row);
        const amount = Math.abs(row.amountCents);

        if (classification.type === "TRANSFER") {
          const targetAccount = await resolveOrCreateAccountByName(
            userId,
            classification.targetAccountName ?? "Conta importada",
            classification.targetAccountType ?? "SAVINGS",
            session,
            accountCache
          );
          const targetAccountId = String(targetAccount._id);

          const origin = classification.reversed ? targetAccountId : accountId;
          const destination = classification.reversed ? accountId : targetAccountId;

          planned.push({
            accountId: origin,
            toAccountId: destination,
            type: "TRANSFER",
            amount,
            date: row.date,
            description: row.description,
            normalizedDescription: normalizeDescription(row.description),
          });
        } else {
          const categoryId = await merchantCategoryRuleService.suggestCategory(
            userId,
            row.description
          );
          planned.push({
            accountId,
            categoryId: categoryId ?? undefined,
            type: classification.type,
            amount,
            date: row.date,
            description: row.description,
            normalizedDescription: normalizeDescription(row.description),
          });
        }
      }

      // Dedup (IMP-01 AC3): same accountId + date (day) + amount + normalized
      // description as an already-existing transaction is skipped.
      const involvedAccountIds = [...new Set(planned.map((p) => p.accountId))];
      const dates = planned.map((p) => p.date.getTime());
      const minDate = new Date(Math.min(...dates));
      minDate.setUTCHours(0, 0, 0, 0);
      const maxDate = new Date(Math.max(...dates));
      maxDate.setUTCHours(23, 59, 59, 999);

      const existingByAccount = new Map<string, Set<string>>();
      for (const accId of involvedAccountIds) {
        const existing = await transactionRepository.list(userId, {
          accountId: accId,
          from: minDate,
          to: maxDate,
        });
        const keys = new Set(
          existing.map(
            (tx) =>
              `${tx.date.toISOString().slice(0, 10)}|${tx.amount}|${normalizeDescription(tx.description)}`
          )
        );
        existingByAccount.set(accId, keys);
      }

      const toInsert: PlannedTransaction[] = [];
      let skipped = 0;
      for (const p of planned) {
        const key = `${p.date.toISOString().slice(0, 10)}|${p.amount}|${p.normalizedDescription}`;
        const seen = existingByAccount.get(p.accountId) ?? new Set<string>();
        if (seen.has(key)) {
          skipped += 1;
          continue;
        }
        seen.add(key);
        existingByAccount.set(p.accountId, seen);
        toInsert.push(p);
      }

      const balanceDeltas = new Map<string, number>();
      for (const p of toInsert) {
        await transactionRepository.create(
          {
            userId,
            accountId: p.accountId,
            toAccountId: p.toAccountId,
            categoryId: p.categoryId,
            type: p.type,
            amount: p.amount,
            date: p.date,
            description: p.description,
            isPaid: true,
          },
          session
        );

        if (p.type === "INCOME") {
          balanceDeltas.set(p.accountId, (balanceDeltas.get(p.accountId) ?? 0) + p.amount);
        } else if (p.type === "EXPENSE") {
          balanceDeltas.set(p.accountId, (balanceDeltas.get(p.accountId) ?? 0) - p.amount);
        } else if (p.type === "TRANSFER" && p.toAccountId) {
          balanceDeltas.set(p.accountId, (balanceDeltas.get(p.accountId) ?? 0) - p.amount);
          balanceDeltas.set(p.toAccountId, (balanceDeltas.get(p.toAccountId) ?? 0) + p.amount);
        }
      }

      for (const [accId, delta] of balanceDeltas) {
        if (delta !== 0) {
          const updatedAccount = await accountService.adjustBalance(accId, delta, session);
          
          if (updatedAccount && updatedAccount.type === "SAVINGS" && updatedAccount.balance < 0) {
            const yieldAmount = Math.abs(updatedAccount.balance);
            
            await transactionRepository.create(
              {
                userId,
                accountId: accId,
                type: "INCOME",
                amount: yieldAmount,
                date: maxDate,
                description: "Rendimento CDI (Auto-ajuste)",
                isPaid: true,
              },
              session
            );
            
            await accountService.adjustBalance(accId, yieldAmount, session);
          }
        }
      }

      result = { imported: toInsert.length, skipped };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

export const importService = {
  classifyPicPayRow,
  resolveOrCreateAccountByName,
  importTransactions,
};

export default importService;

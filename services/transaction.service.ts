import mongoose from "mongoose";
import { transactionRepository } from "@/repositories/transaction.repository";
import { accountService } from "@/services/account.service";
import { accountRepository } from "@/repositories/account.repository";
import { categoryRepository } from "@/repositories/category.repository";
import { merchantCategoryRuleService } from "@/services/merchant-category-rule.service";
import type { TransactionType } from "@/models/Transaction";
import type {
  ListTransactionsFilters,
  UpdateTransactionInput as RepoUpdateInput,
} from "@/repositories/transaction.repository";

const MAX_AMOUNT_CENTS = 1_000_000_00; // R$1.000.000,00
const MAX_DESCRIPTION_LENGTH = 200;

export class InvalidTransactionAmountError extends Error {
  constructor() {
    super("Transaction amount must be greater than zero and at most R$1.000.000,00");
    this.name = "InvalidTransactionAmountError";
  }
}

export class InvalidTransactionDescriptionError extends Error {
  constructor() {
    super("Transaction description must be at most 200 characters");
    this.name = "InvalidTransactionDescriptionError";
  }
}

export class SameOriginDestinationAccountError extends Error {
  constructor() {
    super("A TRANSFER must have a different origin and destination account");
    this.name = "SameOriginDestinationAccountError";
  }
}

export class CategoryRequiredError extends Error {
  constructor() {
    super("categoryId is required for INCOME and EXPENSE transactions");
    this.name = "CategoryRequiredError";
  }
}

export class CategoryNotAllowedError extends Error {
  constructor() {
    super("categoryId is not allowed for TRANSFER transactions");
    this.name = "CategoryNotAllowedError";
  }
}

export class TransactionNotFoundError extends Error {
  constructor() {
    super("Transaction not found");
    this.name = "TransactionNotFoundError";
  }
}

export class AccountNotFoundError extends Error {
  constructor() {
    super("Account not found");
    this.name = "AccountNotFoundError";
  }
}

export class CategoryNotFoundError extends Error {
  constructor() {
    super("Category not found");
    this.name = "CategoryNotFoundError";
  }
}

export interface CreateTransactionInput {
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  date: Date;
  description: string;
  isPaid: boolean;
}

export interface UpdateTransactionInput {
  accountId?: string;
  toAccountId?: string;
  categoryId?: string;
  type?: TransactionType;
  amount?: number;
  date?: Date;
  description?: string;
  isPaid?: boolean;
}

function assertValidAmount(amount: number) {
  if (!(amount > 0) || amount > MAX_AMOUNT_CENTS) {
    throw new InvalidTransactionAmountError();
  }
}

function assertValidDescription(description: string) {
  if (typeof description !== "string" || description.length > MAX_DESCRIPTION_LENGTH) {
    throw new InvalidTransactionDescriptionError();
  }
}

function assertValidCategoryUsage(type: TransactionType, categoryId?: string) {
  if (type === "TRANSFER") {
    if (categoryId) {
      throw new CategoryNotAllowedError();
    }
    return;
  }
  if (!categoryId) {
    throw new CategoryRequiredError();
  }
}

function assertValidTransferAccounts(
  type: TransactionType,
  accountId: string,
  toAccountId?: string
) {
  if (type === "TRANSFER" && accountId === toAccountId) {
    throw new SameOriginDestinationAccountError();
  }
}

/**
 * Confirms accountId/toAccountId/categoryId actually belong to userId before
 * they're written onto a transaction — otherwise a user could reference
 * another user's account/category by guessing its ObjectId.
 */
async function assertOwnedReferences(
  userId: string,
  accountId: string,
  toAccountId: string | undefined,
  categoryId: string | undefined
) {
  const accountIds = [accountId, ...(toAccountId ? [toAccountId] : [])];
  for (const id of accountIds) {
    const account = await accountRepository.findById(userId, id);
    if (!account) {
      throw new AccountNotFoundError();
    }
  }
  if (categoryId) {
    const category = await categoryRepository.findById(userId, categoryId);
    if (!category) {
      throw new CategoryNotFoundError();
    }
  }
}

/**
 * Applies the balance effect of a (type, amount) pair to the involved
 * account(s), inside the given Mongo session. INCOME credits the account,
 * EXPENSE debits it, TRANSFER debits the origin and credits the destination.
 * Pass a negative `sign` to reverse a previously-applied effect.
 */
async function applyBalanceEffect(
  type: TransactionType,
  accountId: string,
  toAccountId: string | undefined,
  amount: number,
  sign: 1 | -1,
  session: mongoose.ClientSession
) {
  if (type === "INCOME") {
    await accountService.adjustBalance(accountId, sign * amount, session);
  } else if (type === "EXPENSE") {
    await accountService.adjustBalance(accountId, -sign * amount, session);
  } else if (type === "TRANSFER" && toAccountId) {
    await accountService.adjustBalance(accountId, -sign * amount, session);
    await accountService.adjustBalance(toAccountId, sign * amount, session);
  }
}

/**
 * CAT-02 AC1: whenever an EXPENSE/INCOME transaction is saved with a
 * manually-set categoryId, upserts the merchantKey -> categoryId rule so
 * future transactions with the same description can reuse it. TRANSFER
 * transactions never carry a categoryId, so this is a no-op for them.
 */
async function maybeUpsertMerchantRule(
  userId: string,
  type: TransactionType,
  categoryId: string | undefined,
  description: string
) {
  if (type === "TRANSFER" || !categoryId) {
    return;
  }
  await merchantCategoryRuleService.upsertRuleFromCategorization(userId, description, categoryId);
}

export const transactionService = {
  async createTransaction(userId: string, input: CreateTransactionInput) {
    assertValidAmount(input.amount);
    assertValidDescription(input.description);
    assertValidCategoryUsage(input.type, input.categoryId);
    assertValidTransferAccounts(input.type, input.accountId, input.toAccountId);
    await assertOwnedReferences(
      userId,
      input.accountId,
      input.toAccountId,
      input.categoryId
    );

    const isPaid = input.type === "TRANSFER" ? true : input.isPaid;

    const session = await mongoose.startSession();
    try {
      let created;
      await session.withTransaction(async () => {
        created = await transactionRepository.create(
          {
            userId,
            accountId: input.accountId,
            toAccountId: input.toAccountId,
            categoryId: input.categoryId,
            type: input.type,
            amount: input.amount,
            date: input.date,
            description: input.description,
            isPaid,
          },
          session
        );

        if (isPaid) {
          await applyBalanceEffect(
            input.type,
            input.accountId,
            input.toAccountId,
            input.amount,
            1,
            session
          );
        }
      });
      await maybeUpsertMerchantRule(userId, input.type, input.categoryId, input.description);
      return created;
    } finally {
      await session.endSession();
    }
  },

  async updateTransaction(userId: string, id: string, input: UpdateTransactionInput) {
    const existing = await transactionRepository.findById(userId, id);
    if (!existing) {
      throw new TransactionNotFoundError();
    }

    const nextType = (input.type ?? existing.type) as TransactionType;
    const nextAccountId = input.accountId ?? String(existing.accountId);
    const nextToAccountId =
      input.toAccountId !== undefined
        ? input.toAccountId
        : existing.toAccountId
          ? String(existing.toAccountId)
          : undefined;
    const nextCategoryId =
      input.categoryId !== undefined
        ? input.categoryId
        : existing.categoryId
          ? String(existing.categoryId)
          : undefined;
    const nextAmount = input.amount ?? existing.amount;
    const nextDescription = input.description ?? existing.description;
    const nextIsPaid =
      nextType === "TRANSFER" ? true : (input.isPaid ?? existing.isPaid);

    assertValidAmount(nextAmount);
    assertValidDescription(nextDescription);
    assertValidCategoryUsage(nextType, nextCategoryId);
    assertValidTransferAccounts(nextType, nextAccountId, nextToAccountId);
    await assertOwnedReferences(userId, nextAccountId, nextToAccountId, nextCategoryId);

    const session = await mongoose.startSession();
    try {
      let updated;
      await session.withTransaction(async () => {
        if (existing.isPaid) {
          await applyBalanceEffect(
            existing.type as TransactionType,
            String(existing.accountId),
            existing.toAccountId ? String(existing.toAccountId) : undefined,
            existing.amount,
            -1,
            session
          );
        }

        const patch: RepoUpdateInput = {
          accountId: nextAccountId,
          toAccountId: nextToAccountId ?? null,
          categoryId: nextCategoryId ?? null,
          type: nextType,
          amount: nextAmount,
          date: input.date ?? existing.date,
          description: nextDescription,
          isPaid: nextIsPaid,
        };
        updated = await transactionRepository.update(userId, id, patch, session);

        if (nextIsPaid) {
          await applyBalanceEffect(
            nextType,
            nextAccountId,
            nextToAccountId,
            nextAmount,
            1,
            session
          );
        }
      });
      await maybeUpsertMerchantRule(userId, nextType, nextCategoryId, nextDescription);
      return updated;
    } finally {
      await session.endSession();
    }
  },

  async deleteTransaction(userId: string, id: string) {
    const existing = await transactionRepository.findById(userId, id);
    if (!existing) {
      throw new TransactionNotFoundError();
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (existing.isPaid) {
          await applyBalanceEffect(
            existing.type as TransactionType,
            String(existing.accountId),
            existing.toAccountId ? String(existing.toAccountId) : undefined,
            existing.amount,
            -1,
            session
          );
        }
        await transactionRepository.delete(userId, id, session);
      });
    } finally {
      await session.endSession();
    }
  },

  async setPaidStatus(userId: string, id: string, isPaid: boolean) {
    const existing = await transactionRepository.findById(userId, id);
    if (!existing) {
      throw new TransactionNotFoundError();
    }

    if (existing.isPaid === isPaid) {
      return existing;
    }

    const session = await mongoose.startSession();
    try {
      let updated;
      await session.withTransaction(async () => {
        const sign = isPaid ? 1 : -1;
        await applyBalanceEffect(
          existing.type as TransactionType,
          String(existing.accountId),
          existing.toAccountId ? String(existing.toAccountId) : undefined,
          existing.amount,
          sign,
          session
        );
        updated = await transactionRepository.update(userId, id, { isPaid }, session);
      });
      return updated;
    } finally {
      await session.endSession();
    }
  },

  async listTransactions(userId: string, filters: ListTransactionsFilters = {}) {
    return transactionRepository.list(userId, filters);
  },

  async getTransaction(userId: string, id: string) {
    const found = await transactionRepository.findById(userId, id);
    if (!found) {
      throw new TransactionNotFoundError();
    }
    return found;
  },
};

export default transactionService;

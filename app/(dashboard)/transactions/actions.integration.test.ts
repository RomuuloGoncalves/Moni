import { describe, expect, it, vi, beforeEach } from "vitest";
import mongoose from "mongoose";

const mockGetServerSession = vi.fn();
vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

import {
  listTransactionsAction,
  createTransactionAction,
  updateTransactionAction,
  deleteTransactionAction,
  setPaidAction,
} from "./actions";
import { accountRepository } from "@/repositories/account.repository";
import { categoryRepository } from "@/repositories/category.repository";

function mockSession(userId: string | null) {
  mockGetServerSession.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

function newId() {
  return String(new mongoose.Types.ObjectId());
}

async function createCategory(userId: string, name = "Categoria") {
  const category = await categoryRepository.create({
    userId,
    name,
    color: "#000000",
    iconType: "tag",
  });
  return String(category._id);
}

describe("transaction Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated calls", async () => {
    mockSession(null);
    const result = await listTransactionsAction();
    expect(result.error).toBe("não autenticado");
  });

  it("creates an EXPENSE, updates and deletes it end-to-end, keeping the account balance consistent", async () => {
    const userId = newId();
    mockSession(userId);
    const account = await accountRepository.create({
      userId,
      name: "Conta",
      type: "CHECKING",
      balance: 10000,
    });
    const categoryId = await createCategory(userId);

    const created = await createTransactionAction({
      accountId: String(account._id),
      categoryId,
      type: "EXPENSE",
      amount: 3000,
      date: new Date("2026-01-05"),
      description: "Mercado",
      isPaid: true,
    });
    expect(created.error).toBeUndefined();
    const txId = String((created.data as { _id: unknown })._id);

    let acc = await accountRepository.findById(userId, String(account._id));
    expect(acc?.balance).toBe(7000);

    const updated = await updateTransactionAction(txId, { amount: 5000 });
    expect(updated.error).toBeUndefined();
    acc = await accountRepository.findById(userId, String(account._id));
    expect(acc?.balance).toBe(5000);

    const deleted = await deleteTransactionAction(txId);
    expect(deleted.error).toBeUndefined();
    acc = await accountRepository.findById(userId, String(account._id));
    expect(acc?.balance).toBe(10000);
  });

  it("validation errors are surfaced as typed action errors", async () => {
    const userId = newId();
    mockSession(userId);
    const account = await accountRepository.create({
      userId,
      name: "Conta",
      type: "CHECKING",
      balance: 0,
    });

    const result = await createTransactionAction({
      accountId: String(account._id),
      toAccountId: String(account._id),
      type: "TRANSFER",
      amount: 100,
      date: new Date(),
      description: "Invalid",
      isPaid: true,
    });
    expect(result.error).toBe("conta de origem e destino não podem ser iguais");
  });

  it("TXN-01 AC10: lists only the authenticated user's transactions, sorted by date desc", async () => {
    const userId = newId();
    const otherUserId = newId();
    mockSession(userId);
    const account = await accountRepository.create({
      userId,
      name: "Conta",
      type: "CHECKING",
      balance: 0,
    });
    const categoryId = await createCategory(userId);
    await createTransactionAction({
      accountId: String(account._id),
      categoryId,
      type: "EXPENSE",
      amount: 100,
      date: new Date("2026-01-01"),
      description: "Old",
      isPaid: false,
    });
    await createTransactionAction({
      accountId: String(account._id),
      categoryId,
      type: "EXPENSE",
      amount: 200,
      date: new Date("2026-01-10"),
      description: "Recent",
      isPaid: false,
    });

    mockSession(otherUserId);
    const otherAccount = await accountRepository.create({
      userId: otherUserId,
      name: "Outra conta",
      type: "CHECKING",
      balance: 0,
    });
    const otherCategoryId = await createCategory(otherUserId, "Categoria de outro usuário");
    await createTransactionAction({
      accountId: String(otherAccount._id),
      categoryId: otherCategoryId,
      type: "EXPENSE",
      amount: 999,
      date: new Date("2026-01-15"),
      description: "Other user",
      isPaid: false,
    });

    mockSession(userId);
    const list = await listTransactionsAction();
    expect(list.data).toHaveLength(2);
    expect((list.data as { description: string }[])[0].description).toBe("Recent");
  });

  it("TXN-04: listTransactionsAction filters by date range (month filter) and falls back to the full list when no filter is given", async () => {
    const userId = newId();
    mockSession(userId);
    const account = await accountRepository.create({
      userId,
      name: "Conta",
      type: "CHECKING",
      balance: 0,
    });
    const categoryId = await createCategory(userId);
    await createTransactionAction({
      accountId: String(account._id),
      categoryId,
      type: "EXPENSE",
      amount: 100,
      date: new Date("2026-01-15"),
      description: "Janeiro",
      isPaid: false,
    });
    await createTransactionAction({
      accountId: String(account._id),
      categoryId,
      type: "EXPENSE",
      amount: 200,
      date: new Date("2026-02-10"),
      description: "Fevereiro",
      isPaid: false,
    });

    const filtered = await listTransactionsAction({
      from: new Date("2026-02-01T00:00:00.000Z"),
      to: new Date("2026-02-28T23:59:59.999Z"),
    });
    expect(filtered.error).toBeUndefined();
    expect(filtered.data).toHaveLength(1);
    expect((filtered.data as { description: string }[])[0].description).toBe("Fevereiro");

    const unfiltered = await listTransactionsAction();
    expect(unfiltered.data).toHaveLength(2);
  });

  it("setPaidAction toggles isPaid and applies/reverts the balance effect", async () => {
    const userId = newId();
    mockSession(userId);
    const account = await accountRepository.create({
      userId,
      name: "Conta",
      type: "CHECKING",
      balance: 0,
    });
    const created = await createTransactionAction({
      accountId: String(account._id),
      categoryId: await createCategory(userId),
      type: "INCOME",
      amount: 1000,
      date: new Date(),
      description: "Salário",
      isPaid: false,
    });
    const txId = String((created.data as { _id: unknown })._id);

    let acc = await accountRepository.findById(userId, String(account._id));
    expect(acc?.balance).toBe(0);

    await setPaidAction(txId, true);
    acc = await accountRepository.findById(userId, String(account._id));
    expect(acc?.balance).toBe(1000);

    await setPaidAction(txId, false);
    acc = await accountRepository.findById(userId, String(account._id));
    expect(acc?.balance).toBe(0);
  });
});

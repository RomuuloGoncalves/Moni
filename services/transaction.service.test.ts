import { describe, expect, it, vi, beforeEach } from "vitest";

const fakeSession = {
  withTransaction: vi.fn(async (fn: () => Promise<void>) => {
    await fn();
  }),
  endSession: vi.fn(async () => {}),
};

vi.mock("mongoose", async () => {
  const actual = await vi.importActual<typeof import("mongoose")>("mongoose");
  return {
    ...actual,
    default: {
      ...actual.default,
      startSession: vi.fn(async () => fakeSession),
    },
    startSession: vi.fn(async () => fakeSession),
  };
});

vi.mock("@/repositories/transaction.repository", () => ({
  transactionRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/services/account.service", () => ({
  accountService: {
    adjustBalance: vi.fn(),
  },
}));

vi.mock("@/repositories/account.repository", () => ({
  accountRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/repositories/category.repository", () => ({
  categoryRepository: {
    findById: vi.fn(),
  },
}));

import mongoose from "mongoose";
import { transactionRepository } from "@/repositories/transaction.repository";
import { accountService } from "@/services/account.service";
import { accountRepository } from "@/repositories/account.repository";
import { categoryRepository } from "@/repositories/category.repository";
import {
  transactionService,
  InvalidTransactionAmountError,
  InvalidTransactionDescriptionError,
  SameOriginDestinationAccountError,
  CategoryRequiredError,
  CategoryNotAllowedError,
  TransactionNotFoundError,
  AccountNotFoundError,
  CategoryNotFoundError,
} from "@/services/transaction.service";

const repo = vi.mocked(transactionRepository);
const acctSvc = vi.mocked(accountService);
const acctRepo = vi.mocked(accountRepository);
const catRepo = vi.mocked(categoryRepository);

const userId = "user1";
const accountId = "acc1";
const toAccountId = "acc2";
const categoryId = "cat1";

describe("transactionService.createTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    acctRepo.findById.mockResolvedValue({ _id: accountId } as never);
    catRepo.findById.mockResolvedValue({ _id: categoryId } as never);
  });

  it("TXN-01: rejects an accountId that doesn't belong to the authenticated user", async () => {
    acctRepo.findById.mockResolvedValueOnce(null);

    await expect(
      transactionService.createTransaction(userId, {
        accountId: "someone-elses-account",
        categoryId,
        type: "EXPENSE",
        amount: 100,
        date: new Date(),
        description: "Mercado",
        isPaid: true,
      })
    ).rejects.toThrow(AccountNotFoundError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("TXN-01: rejects a categoryId that doesn't belong to the authenticated user", async () => {
    catRepo.findById.mockResolvedValueOnce(null);

    await expect(
      transactionService.createTransaction(userId, {
        accountId,
        categoryId: "someone-elses-category",
        type: "EXPENSE",
        amount: 100,
        date: new Date(),
        description: "Mercado",
        isPaid: true,
      })
    ).rejects.toThrow(CategoryNotFoundError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("TXN-01: rejects a TRANSFER toAccountId that doesn't belong to the authenticated user", async () => {
    acctRepo.findById.mockImplementation(async (_userId, id) =>
      id === accountId ? ({ _id: accountId } as never) : null
    );

    await expect(
      transactionService.createTransaction(userId, {
        accountId,
        toAccountId: "someone-elses-account",
        type: "TRANSFER",
        amount: 100,
        date: new Date(),
        description: "Transferência",
        isPaid: true,
      })
    ).rejects.toThrow(AccountNotFoundError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("TXN-01 AC1: paid INCOME credits the account balance immediately", async () => {
    repo.create.mockResolvedValue({ _id: "t1" } as never);

    await transactionService.createTransaction(userId, {
      accountId,
      categoryId,
      type: "INCOME",
      amount: 10000,
      date: new Date(),
      description: "Salário",
      isPaid: true,
    });

    expect(acctSvc.adjustBalance).toHaveBeenCalledWith(accountId, 10000, fakeSession);
  });

  it("TXN-01 AC1: paid EXPENSE debits the account balance immediately", async () => {
    repo.create.mockResolvedValue({ _id: "t1" } as never);

    await transactionService.createTransaction(userId, {
      accountId,
      categoryId,
      type: "EXPENSE",
      amount: 3000,
      date: new Date(),
      description: "Mercado",
      isPaid: true,
    });

    expect(acctSvc.adjustBalance).toHaveBeenCalledWith(accountId, -3000, fakeSession);
  });

  it("TXN-01 AC2: unpaid transaction does not change any balance", async () => {
    repo.create.mockResolvedValue({ _id: "t1" } as never);

    await transactionService.createTransaction(userId, {
      accountId,
      categoryId,
      type: "EXPENSE",
      amount: 3000,
      date: new Date(),
      description: "Mercado",
      isPaid: false,
    });

    expect(acctSvc.adjustBalance).not.toHaveBeenCalled();
  });

  it("TXN-01 AC4: paid TRANSFER debits origin and credits destination atomically", async () => {
    repo.create.mockResolvedValue({ _id: "t1" } as never);

    await transactionService.createTransaction(userId, {
      accountId,
      toAccountId,
      type: "TRANSFER",
      amount: 5000,
      date: new Date(),
      description: "Transferência",
      isPaid: true,
    });

    expect(acctSvc.adjustBalance).toHaveBeenNthCalledWith(1, accountId, -5000, fakeSession);
    expect(acctSvc.adjustBalance).toHaveBeenNthCalledWith(2, toAccountId, 5000, fakeSession);
    expect(mongoose.startSession).toHaveBeenCalled();
  });

  it("TXN-01 AC5: rejects TRANSFER with same origin and destination account", async () => {
    await expect(
      transactionService.createTransaction(userId, {
        accountId,
        toAccountId: accountId,
        type: "TRANSFER",
        amount: 100,
        date: new Date(),
        description: "Invalid",
        isPaid: true,
      })
    ).rejects.toBeInstanceOf(SameOriginDestinationAccountError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("TXN-01 AC6: rejects amount <= 0", async () => {
    await expect(
      transactionService.createTransaction(userId, {
        accountId,
        categoryId,
        type: "EXPENSE",
        amount: 0,
        date: new Date(),
        description: "Invalid",
        isPaid: true,
      })
    ).rejects.toBeInstanceOf(InvalidTransactionAmountError);
  });

  it("TXN-01 AC6: rejects amount above R$1.000.000,00", async () => {
    await expect(
      transactionService.createTransaction(userId, {
        accountId,
        categoryId,
        type: "EXPENSE",
        amount: 100_000_001,
        date: new Date(),
        description: "Invalid",
        isPaid: true,
      })
    ).rejects.toBeInstanceOf(InvalidTransactionAmountError);
  });

  it("TXN-01 AC11: rejects description longer than 200 characters", async () => {
    await expect(
      transactionService.createTransaction(userId, {
        accountId,
        categoryId,
        type: "EXPENSE",
        amount: 100,
        date: new Date(),
        description: "a".repeat(201),
        isPaid: true,
      })
    ).rejects.toBeInstanceOf(InvalidTransactionDescriptionError);
  });

  it("TXN-01 AC9: requires categoryId for INCOME/EXPENSE", async () => {
    await expect(
      transactionService.createTransaction(userId, {
        accountId,
        type: "EXPENSE",
        amount: 100,
        date: new Date(),
        description: "No category",
        isPaid: true,
      })
    ).rejects.toBeInstanceOf(CategoryRequiredError);
  });

  it("TXN-01 AC9: rejects categoryId for TRANSFER", async () => {
    await expect(
      transactionService.createTransaction(userId, {
        accountId,
        toAccountId,
        categoryId,
        type: "TRANSFER",
        amount: 100,
        date: new Date(),
        description: "Invalid",
        isPaid: true,
      })
    ).rejects.toBeInstanceOf(CategoryNotAllowedError);
  });
});

describe("transactionService.updateTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    acctRepo.findById.mockResolvedValue({ _id: accountId } as never);
    catRepo.findById.mockResolvedValue({ _id: categoryId } as never);
  });

  it("TXN-01 AC3: marking an unpaid transaction as paid applies the balance effect", async () => {
    repo.findById.mockResolvedValue({
      _id: "t1",
      userId,
      accountId,
      categoryId,
      type: "EXPENSE",
      amount: 2000,
      date: new Date(),
      description: "Conta",
      isPaid: false,
    } as never);
    repo.update.mockResolvedValue({ _id: "t1", isPaid: true } as never);

    await transactionService.updateTransaction(userId, "t1", { isPaid: true });

    expect(acctSvc.adjustBalance).toHaveBeenCalledTimes(1);
    expect(acctSvc.adjustBalance).toHaveBeenCalledWith(accountId, -2000, fakeSession);
  });

  it("TXN-01 AC7: editing amount on a paid transaction reverts old effect and applies the new one", async () => {
    repo.findById.mockResolvedValue({
      _id: "t1",
      userId,
      accountId,
      categoryId,
      type: "EXPENSE",
      amount: 2000,
      date: new Date(),
      description: "Conta",
      isPaid: true,
    } as never);
    repo.update.mockResolvedValue({ _id: "t1", amount: 5000 } as never);

    await transactionService.updateTransaction(userId, "t1", { amount: 5000 });

    // revert old effect (+2000, since it was an EXPENSE debit of 2000) then apply new (-5000)
    expect(acctSvc.adjustBalance).toHaveBeenNthCalledWith(1, accountId, 2000, fakeSession);
    expect(acctSvc.adjustBalance).toHaveBeenNthCalledWith(2, accountId, -5000, fakeSession);
  });

  it("TXN-01 AC7: editing account on a paid transaction reverts effect on old account and applies on new account", async () => {
    const newAccountId = "acc3";
    repo.findById.mockResolvedValue({
      _id: "t1",
      userId,
      accountId,
      categoryId,
      type: "EXPENSE",
      amount: 1000,
      date: new Date(),
      description: "Conta",
      isPaid: true,
    } as never);
    repo.update.mockResolvedValue({ _id: "t1" } as never);

    await transactionService.updateTransaction(userId, "t1", { accountId: newAccountId });

    expect(acctSvc.adjustBalance).toHaveBeenNthCalledWith(1, accountId, 1000, fakeSession);
    expect(acctSvc.adjustBalance).toHaveBeenNthCalledWith(2, newAccountId, -1000, fakeSession);
  });

  it("throws TransactionNotFoundError when the transaction does not belong to the user", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(
      transactionService.updateTransaction(userId, "missing", { amount: 100 })
    ).rejects.toBeInstanceOf(TransactionNotFoundError);
  });
});

describe("transactionService.deleteTransaction / setPaidStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TXN-01 AC8: deleting a paid transaction reverts its balance effect", async () => {
    repo.findById.mockResolvedValue({
      _id: "t1",
      userId,
      accountId,
      categoryId,
      type: "INCOME",
      amount: 4000,
      date: new Date(),
      description: "Salário",
      isPaid: true,
    } as never);

    await transactionService.deleteTransaction(userId, "t1");

    expect(acctSvc.adjustBalance).toHaveBeenCalledWith(accountId, -4000, fakeSession);
    expect(repo.delete).toHaveBeenCalledWith(userId, "t1", fakeSession);
  });

  it("deleting an unpaid transaction does not touch any balance", async () => {
    repo.findById.mockResolvedValue({
      _id: "t1",
      userId,
      accountId,
      categoryId,
      type: "INCOME",
      amount: 4000,
      date: new Date(),
      description: "Salário",
      isPaid: false,
    } as never);

    await transactionService.deleteTransaction(userId, "t1");

    expect(acctSvc.adjustBalance).not.toHaveBeenCalled();
    expect(repo.delete).toHaveBeenCalledWith(userId, "t1", fakeSession);
  });

  it("setPaidStatus round-trips the balance: false -> true -> false nets to zero effect", async () => {
    const base = {
      _id: "t1",
      userId,
      accountId,
      categoryId,
      type: "EXPENSE" as const,
      amount: 1500,
      date: new Date(),
      description: "Conta",
    };

    repo.findById.mockResolvedValueOnce({ ...base, isPaid: false } as never);
    repo.update.mockResolvedValueOnce({ ...base, isPaid: true } as never);
    await transactionService.setPaidStatus(userId, "t1", true);
    expect(acctSvc.adjustBalance).toHaveBeenNthCalledWith(1, accountId, -1500, fakeSession);

    repo.findById.mockResolvedValueOnce({ ...base, isPaid: true } as never);
    repo.update.mockResolvedValueOnce({ ...base, isPaid: false } as never);
    await transactionService.setPaidStatus(userId, "t1", false);
    expect(acctSvc.adjustBalance).toHaveBeenNthCalledWith(2, accountId, 1500, fakeSession);
  });

  it("setPaidStatus is a no-op when the status does not change", async () => {
    repo.findById.mockResolvedValue({
      _id: "t1",
      userId,
      accountId,
      categoryId,
      type: "EXPENSE",
      amount: 1000,
      date: new Date(),
      description: "Conta",
      isPaid: true,
    } as never);

    await transactionService.setPaidStatus(userId, "t1", true);

    expect(acctSvc.adjustBalance).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe("transactionService.listTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TXN-01 AC10: delegates to the repository scoped by userId, sorted by date desc (repo responsibility)", async () => {
    repo.list.mockResolvedValue([{ _id: "t1" }] as never);
    const result = await transactionService.listTransactions(userId, { accountId });
    expect(repo.list).toHaveBeenCalledWith(userId, { accountId });
    expect(result).toHaveLength(1);
  });
});

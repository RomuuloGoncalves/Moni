import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/connect", () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/repositories/account.repository", () => ({
  accountRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    adjustBalance: vi.fn(),
  },
}));

vi.mock("@/repositories/transaction.repository", () => ({
  transactionRepository: {
    existsFor: vi.fn(),
  },
}));

import { accountRepository } from "@/repositories/account.repository";
import { transactionRepository } from "@/repositories/transaction.repository";
import {
  accountService,
  InvalidAccountNameError,
  AccountHasTransactionsError,
  AccountNotFoundError,
} from "@/services/account.service";

const repo = vi.mocked(accountRepository);
const txnRepo = vi.mocked(transactionRepository);

describe("accountService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ACC-01 AC2: rejects empty account name", async () => {
    await expect(
      accountService.createAccount("user1", { name: "", type: "CHECKING", balance: 0 })
    ).rejects.toBeInstanceOf(InvalidAccountNameError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("ACC-01 AC2: rejects account name longer than 60 chars", async () => {
    const longName = "a".repeat(61);
    await expect(
      accountService.createAccount("user1", { name: longName, type: "CHECKING", balance: 0 })
    ).rejects.toBeInstanceOf(InvalidAccountNameError);
  });

  it("creates an account with a valid name", async () => {
    repo.create.mockResolvedValue({ _id: "507f1f77bcf86cd799439011", name: "Conta", type: "CHECKING", balance: 0 });
    const result = await accountService.createAccount("user1", {
      name: "Conta",
      type: "CHECKING",
      balance: 0,
    });
    expect(result).toMatchObject({ name: "Conta" });
    expect(repo.create).toHaveBeenCalledWith({
      userId: "user1",
      name: "Conta",
      type: "CHECKING",
      balance: 0,
    });
  });

  it("ACC-01 AC3: updateAccount persists name/type without touching balance", async () => {
    repo.update.mockResolvedValue({ _id: "507f1f77bcf86cd799439011", name: "New", type: "SAVINGS", balance: 5000 });
    const result = await accountService.updateAccount("user1", "507f1f77bcf86cd799439011", {
      name: "New",
      type: "SAVINGS",
    });
    expect(repo.update).toHaveBeenCalledWith("user1", "507f1f77bcf86cd799439011", { name: "New", type: "SAVINGS" });
    expect(result.balance).toBe(5000);
  });

  it("updateAccount throws AccountNotFoundError when not found/not owned", async () => {
    repo.update.mockResolvedValue(null);
    await expect(
      accountService.updateAccount("user1", "missing", { name: "X" })
    ).rejects.toBeInstanceOf(AccountNotFoundError);
  });

  it("ACC-01 AC4: deleteAccount blocked when dependent transactions exist", async () => {
    repo.findById.mockResolvedValue({ _id: "507f1f77bcf86cd799439011", userId: "user1" });
    txnRepo.existsFor.mockResolvedValue(true);

    await expect(accountService.deleteAccount("user1", "507f1f77bcf86cd799439011")).rejects.toBeInstanceOf(
      AccountHasTransactionsError
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("deleteAccount succeeds when there are no dependent transactions", async () => {
    repo.findById.mockResolvedValue({ _id: "507f1f77bcf86cd799439011", userId: "user1" });
    txnRepo.existsFor.mockResolvedValue(false);
    repo.delete.mockResolvedValue(true);

    await accountService.deleteAccount("user1", "507f1f77bcf86cd799439011");

    expect(repo.delete).toHaveBeenCalledWith("user1", "507f1f77bcf86cd799439011");
  });

  it("deleteAccount throws AccountNotFoundError when the account doesn't belong to the user", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(accountService.deleteAccount("user1", "507f1f77bcf86cd799439011")).rejects.toBeInstanceOf(
      AccountNotFoundError
    );
  });

  it("ACC-01 AC5: listAccounts delegates to repository scoped by userId", async () => {
    repo.list.mockResolvedValue([{ _id: "507f1f77bcf86cd799439011" }]);
    const result = await accountService.listAccounts("user1");
    expect(repo.list).toHaveBeenCalledWith("user1");
    expect(result).toHaveLength(1);
  });
});

import type { ClientSession } from "mongoose";
import { accountRepository, type UpdateAccountInput } from "@/repositories/account.repository";
import { transactionRepository } from "@/repositories/transaction.repository";
import type { AccountType } from "@/models/Account";

export class InvalidAccountNameError extends Error {
  constructor() {
    super("Account name must not be empty and must be at most 60 characters");
    this.name = "InvalidAccountNameError";
  }
}

export class AccountHasTransactionsError extends Error {
  constructor() {
    super("Cannot delete an account that has transactions linked to it");
    this.name = "AccountHasTransactionsError";
  }
}

export class AccountNotFoundError extends Error {
  constructor() {
    super("Account not found");
    this.name = "AccountNotFoundError";
  }
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  balance: number;
}

function assertValidName(name: string) {
  if (!name || name.trim().length === 0 || name.length > 60) {
    throw new InvalidAccountNameError();
  }
}

/** Checks whether any transaction references this account (as origin or destination). */
async function accountHasTransactions(accountId: string): Promise<boolean> {
  return transactionRepository.existsFor({ accountId });
}

export const accountService = {
  async createAccount(userId: string, input: CreateAccountInput) {
    assertValidName(input.name);
    return accountRepository.create({
      userId,
      name: input.name,
      type: input.type,
      balance: input.balance,
    });
  },

  async updateAccount(userId: string, accountId: string, input: UpdateAccountInput) {
    if (input.name !== undefined) {
      assertValidName(input.name);
    }
    const updated = await accountRepository.update(userId, accountId, input);
    if (!updated) {
      throw new AccountNotFoundError();
    }
    return updated;
  },

  async deleteAccount(userId: string, accountId: string) {
    const existing = await accountRepository.findById(userId, accountId);
    if (!existing) {
      throw new AccountNotFoundError();
    }
    if (await accountHasTransactions(accountId)) {
      throw new AccountHasTransactionsError();
    }
    await accountRepository.delete(userId, accountId);
  },

  async listAccounts(userId: string) {
    return accountRepository.list(userId);
  },

  async getAccount(userId: string, accountId: string) {
    const account = await accountRepository.findById(userId, accountId);
    if (!account) {
      throw new AccountNotFoundError();
    }
    return account;
  },

  async adjustBalance(accountId: string, deltaCents: number, session?: ClientSession) {
    return accountRepository.adjustBalance(accountId, deltaCents, session);
  },
};

export default accountService;

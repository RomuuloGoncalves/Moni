"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import {
  accountService,
  InvalidAccountNameError,
  AccountHasTransactionsError,
  AccountNotFoundError,
} from "@/services/account.service";
import type { AccountType } from "@/models/Account";
import { toPlainObject } from "@/lib/serialize";

interface ActionResult<T> {
  data?: T;
  error?: string;
}

class UnauthenticatedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthenticatedError";
  }
}

async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    throw new UnauthenticatedError();
  }
  return userId;
}

export async function listAccountsAction(): Promise<ActionResult<unknown[]>> {
  try {
    const userId = await requireUserId();
    const accounts = await accountService.listAccounts(userId);
    return { data: toPlainObject(accounts) };
  } catch (err) {
    return { error: mapError(err) };
  }
}

export async function createAccountAction(input: {
  name: string;
  type: AccountType;
  balance: number;
}): Promise<ActionResult<unknown>> {
  try {
    const userId = await requireUserId();
    const account = await accountService.createAccount(userId, input);
    return { data: toPlainObject(account) };
  } catch (err) {
    return { error: mapError(err) };
  }
}

export async function updateAccountAction(
  id: string,
  input: { name?: string; type?: AccountType }
): Promise<ActionResult<unknown>> {
  try {
    const userId = await requireUserId();
    const account = await accountService.updateAccount(userId, id, input);
    return { data: toPlainObject(account) };
  } catch (err) {
    return { error: mapError(err) };
  }
}

export async function deleteAccountAction(id: string): Promise<ActionResult<void>> {
  try {
    const userId = await requireUserId();
    await accountService.deleteAccount(userId, id);
    return {};
  } catch (err) {
    return { error: mapError(err) };
  }
}

function mapError(err: unknown): string {
  if (err instanceof UnauthenticatedError) {
    return "não autenticado";
  }
  if (err instanceof InvalidAccountNameError) {
    return "nome da conta inválido";
  }
  if (err instanceof AccountHasTransactionsError) {
    return "não é possível excluir uma conta com transações vinculadas";
  }
  if (err instanceof AccountNotFoundError) {
    return "conta não encontrada";
  }
  throw err;
}

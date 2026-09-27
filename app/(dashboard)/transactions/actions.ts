"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import {
  transactionService,
  InvalidTransactionAmountError,
  InvalidTransactionDescriptionError,
  SameOriginDestinationAccountError,
  CategoryRequiredError,
  CategoryNotAllowedError,
  TransactionNotFoundError,
} from "@/services/transaction.service";
import type { TransactionType } from "@/models/Transaction";
import type { ListTransactionsFilters } from "@/repositories/transaction.repository";
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

export interface CreateTransactionActionInput {
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  date: Date;
  description: string;
  isPaid: boolean;
}

export interface UpdateTransactionActionInput {
  accountId?: string;
  toAccountId?: string;
  categoryId?: string;
  type?: TransactionType;
  amount?: number;
  date?: Date;
  description?: string;
  isPaid?: boolean;
}

export async function listTransactionsAction(
  filters: ListTransactionsFilters = {}
): Promise<ActionResult<unknown[]>> {
  try {
    const userId = await requireUserId();
    const transactions = await transactionService.listTransactions(userId, filters);
    return { data: toPlainObject(transactions) };
  } catch (err) {
    return { error: mapError(err) };
  }
}

export async function createTransactionAction(
  input: CreateTransactionActionInput
): Promise<ActionResult<unknown>> {
  try {
    const userId = await requireUserId();
    const transaction = await transactionService.createTransaction(userId, input);
    return { data: toPlainObject(transaction) };
  } catch (err) {
    return { error: mapError(err) };
  }
}

export async function updateTransactionAction(
  id: string,
  input: UpdateTransactionActionInput
): Promise<ActionResult<unknown>> {
  try {
    const userId = await requireUserId();
    const transaction = await transactionService.updateTransaction(userId, id, input);
    return { data: toPlainObject(transaction) };
  } catch (err) {
    return { error: mapError(err) };
  }
}

export async function deleteTransactionAction(id: string): Promise<ActionResult<void>> {
  try {
    const userId = await requireUserId();
    await transactionService.deleteTransaction(userId, id);
    return {};
  } catch (err) {
    return { error: mapError(err) };
  }
}

export async function setPaidAction(
  id: string,
  isPaid: boolean
): Promise<ActionResult<unknown>> {
  try {
    const userId = await requireUserId();
    const transaction = await transactionService.setPaidStatus(userId, id, isPaid);
    return { data: toPlainObject(transaction) };
  } catch (err) {
    return { error: mapError(err) };
  }
}

function mapError(err: unknown): string {
  if (err instanceof UnauthenticatedError) {
    return "não autenticado";
  }
  if (err instanceof InvalidTransactionAmountError) {
    return "valor da transação inválido";
  }
  if (err instanceof InvalidTransactionDescriptionError) {
    return "descrição excede o tamanho máximo permitido";
  }
  if (err instanceof SameOriginDestinationAccountError) {
    return "conta de origem e destino não podem ser iguais";
  }
  if (err instanceof CategoryRequiredError) {
    return "categoria é obrigatória para receitas e despesas";
  }
  if (err instanceof CategoryNotAllowedError) {
    return "categoria não é permitida para transferências";
  }
  if (err instanceof TransactionNotFoundError) {
    return "transação não encontrada";
  }
  throw err;
}

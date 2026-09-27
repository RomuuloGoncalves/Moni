"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import {
  budgetService,
  InvalidBudgetLimitError,
  CategoryNotFoundError,
} from "@/services/budget.service";
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

export async function setBudgetAction(
  categoryId: string,
  limitCents: number
): Promise<ActionResult<unknown>> {
  try {
    const userId = await requireUserId();
    const budget = await budgetService.setBudget(userId, categoryId, limitCents);
    return { data: toPlainObject(budget) };
  } catch (err) {
    return { error: mapError(err) };
  }
}

export async function getBudgetProgressAction(): Promise<ActionResult<unknown[]>> {
  try {
    const userId = await requireUserId();
    const now = new Date();
    const progress = await budgetService.getMonthlyBudgetProgress(
      userId,
      now.getUTCMonth() + 1,
      now.getUTCFullYear()
    );
    return { data: toPlainObject(progress) };
  } catch (err) {
    return { error: mapError(err) };
  }
}

function mapError(err: unknown): string {
  if (err instanceof UnauthenticatedError) {
    return "não autenticado";
  }
  if (err instanceof InvalidBudgetLimitError) {
    return "o limite do orçamento deve ser maior que zero";
  }
  if (err instanceof CategoryNotFoundError) {
    return "categoria não encontrada";
  }
  throw err;
}

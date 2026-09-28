"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import {
  budgetService,
  InvalidBudgetLimitError,
  CategoryNotFoundError,
  CategoryInBudgetGroupError,
} from "@/services/budget.service";
import {
  budgetGroupService,
  BudgetGroupNotFoundError,
  DuplicateBudgetGroupNameError,
  InvalidBudgetGroupError,
} from "@/services/budget-group.service";
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

export async function listBudgetGroupsAction(): Promise<ActionResult<unknown[]>> {
  try {
    const userId = await requireUserId();
    const groups = await budgetGroupService.listGroups(userId);
    return { data: toPlainObject(groups) };
  } catch (err) {
    return { error: mapError(err) };
  }
}

export async function createBudgetGroupAction(input: {
  name: string;
  limitCents: number;
  categoryIds: string[];
}): Promise<ActionResult<unknown>> {
  try {
    const userId = await requireUserId();
    const group = await budgetGroupService.createGroup(userId, input);
    return { data: toPlainObject(group) };
  } catch (err) {
    return { error: mapError(err) };
  }
}

export async function updateBudgetGroupAction(
  groupId: string,
  input: { name?: string; limitCents?: number; categoryIds?: string[] }
): Promise<ActionResult<unknown>> {
  try {
    const userId = await requireUserId();
    const group = await budgetGroupService.updateGroup(userId, groupId, input);
    return { data: toPlainObject(group) };
  } catch (err) {
    return { error: mapError(err) };
  }
}

export async function deleteBudgetGroupAction(groupId: string): Promise<ActionResult<void>> {
  try {
    const userId = await requireUserId();
    await budgetGroupService.deleteGroup(userId, groupId);
    return { data: undefined };
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
  if (err instanceof CategoryInBudgetGroupError) {
    return "esta categoria já faz parte de um grupo de orçamento compartilhado";
  }
  if (err instanceof BudgetGroupNotFoundError) {
    return "grupo de orçamento não encontrado";
  }
  if (err instanceof DuplicateBudgetGroupNameError) {
    return "já existe um grupo com este nome";
  }
  if (err instanceof InvalidBudgetGroupError) {
    return err.message;
  }
  throw err;
}

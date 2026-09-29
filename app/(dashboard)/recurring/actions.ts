"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { recurringTransactionService } from "@/services/recurring-transaction.service";
import { toPlainObject } from "@/lib/serialize";
import type { RecurringFrequency, RecurringType } from "@/models/RecurringTransaction";

interface ActionResult<T = void> {
  data?: T;
  error?: string;
}

async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new Error("não autenticado");
  return userId;
}

export async function listRecurringAction(): Promise<ActionResult<unknown[]>> {
  try {
    const userId = await requireUserId();
    const items = await recurringTransactionService.list(userId);
    return { data: toPlainObject(items) };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function createRecurringAction(input: {
  accountId: string;
  categoryId?: string;
  type: RecurringType;
  amountCents: number;
  description: string;
  frequency: RecurringFrequency;
  startDate: string;
}): Promise<ActionResult<{ _id: string }>> {
  try {
    const userId = await requireUserId();
    const created = await recurringTransactionService.create(userId, {
      ...input,
      startDate: new Date(input.startDate),
    });
    return { data: { _id: String(created._id) } };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function updateRecurringAction(
  id: string,
  patch: { isActive?: boolean; amountCents?: number; description?: string }
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await recurringTransactionService.update(userId, id, patch);
    return {};
  } catch (err) {
    return { error: String(err) };
  }
}

export async function deleteRecurringAction(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await recurringTransactionService.delete(userId, id);
    return {};
  } catch (err) {
    return { error: String(err) };
  }
}

export async function detectRecurringPatternsAction(): Promise<ActionResult<unknown[]>> {
  try {
    const userId = await requireUserId();
    const suggestions = await recurringTransactionService.detectPatterns(userId);
    return { data: toPlainObject(suggestions) };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function generateRecurringForMonthAction(
  year: number,
  month: number
): Promise<ActionResult<{ generated: number }>> {
  try {
    const userId = await requireUserId();
    const generated = await recurringTransactionService.generateForMonth(userId, year, month);
    return { data: { generated } };
  } catch (err) {
    return { error: String(err) };
  }
}

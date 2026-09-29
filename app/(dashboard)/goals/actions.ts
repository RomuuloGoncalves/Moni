"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { savingsGoalService } from "@/services/savings-goal.service";
import { toPlainObject } from "@/lib/serialize";

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

export async function listGoalsAction(): Promise<ActionResult<unknown[]>> {
  try {
    const userId = await requireUserId();
    const items = await savingsGoalService.list(userId);
    return { data: toPlainObject(items) };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function createGoalAction(input: {
  name: string;
  targetCents: number;
  deadline?: string;
  color?: string;
  iconType?: string;
}): Promise<ActionResult<{ _id: string }>> {
  try {
    const userId = await requireUserId();
    const created = await savingsGoalService.create(userId, {
      ...input,
      deadline: input.deadline ? new Date(input.deadline) : undefined,
    });
    return { data: { _id: String(created._id) } };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function addContributionAction(
  id: string,
  amountCents: number
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await savingsGoalService.addContribution(userId, id, amountCents);
    return {};
  } catch (err) {
    return { error: String(err) };
  }
}

export async function updateGoalAction(
  id: string,
  patch: { name?: string; targetCents?: number; deadline?: string | null; color?: string }
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await savingsGoalService.update(userId, id, {
      ...patch,
      deadline: patch.deadline === null ? null : patch.deadline ? new Date(patch.deadline) : undefined,
    });
    return {};
  } catch (err) {
    return { error: String(err) };
  }
}

export async function deleteGoalAction(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await savingsGoalService.delete(userId, id);
    return {};
  } catch (err) {
    return { error: String(err) };
  }
}

"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import {
  merchantCategoryRuleService,
  CategoryNotFoundError,
} from "@/services/merchant-category-rule.service";
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

export async function listUncategorizedMerchantsAction(): Promise<ActionResult<unknown[]>> {
  try {
    const userId = await requireUserId();
    const merchants = await merchantCategoryRuleService.listUncategorizedMerchants(userId);
    return { data: toPlainObject(merchants) };
  } catch (err) {
    return { error: mapError(err) };
  }
}

export async function listMerchantRulesAction(): Promise<ActionResult<unknown[]>> {
  try {
    const userId = await requireUserId();
    const rules = await merchantCategoryRuleService.listExistingRules(userId);
    return { data: toPlainObject(rules) };
  } catch (err) {
    return { error: mapError(err) };
  }
}

export async function categorizeMerchantAction(
  merchantKey: string,
  categoryId: string
): Promise<ActionResult<{ updatedCount: number }>> {
  try {
    const userId = await requireUserId();
    const result = await merchantCategoryRuleService.categorizeMerchant(
      userId,
      merchantKey,
      categoryId
    );
    return { data: toPlainObject({ updatedCount: result.updatedCount }) };
  } catch (err) {
    return { error: mapError(err) };
  }
}

export async function bulkCategorizeMerchantsAction(
  merchantKeys: string[],
  categoryId: string
): Promise<ActionResult<{ updatedCount: number }>> {
  try {
    const userId = await requireUserId();
    let total = 0;
    for (const key of merchantKeys) {
      const result = await merchantCategoryRuleService.categorizeMerchant(userId, key, categoryId);
      total += result.updatedCount;
    }
    return { data: { updatedCount: total } };
  } catch (err) {
    return { error: mapError(err) };
  }
}

function mapError(err: unknown): string {
  if (err instanceof UnauthenticatedError) {
    return "não autenticado";
  }
  if (err instanceof CategoryNotFoundError) {
    return "categoria não encontrada";
  }
  throw err;
}

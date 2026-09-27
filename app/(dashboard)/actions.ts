"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { dashboardService } from "@/services/dashboard.service";
import { categoryService } from "@/services/category.service";
import { budgetService } from "@/services/budget.service";
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

export interface DashboardData {
  consolidatedBalance: number;
  month: number;
  year: number;
  summaryByCategory: {
    categoryId: string | null;
    income: number;
    expense: number;
  }[];
  categories: unknown[];
  budgetProgress: unknown[];
}

export async function getDashboardDataAction(): Promise<ActionResult<DashboardData>> {
  try {
    const userId = await requireUserId();
    const now = new Date();
    const month = now.getUTCMonth() + 1;
    const year = now.getUTCFullYear();

    const [consolidatedBalance, summaryByCategory, categories, budgetProgress] =
      await Promise.all([
        dashboardService.getConsolidatedBalance(userId),
        dashboardService.getMonthlySummaryByCategory(userId, month, year),
        categoryService.listCategories(userId),
        budgetService.getMonthlyBudgetProgress(userId, month, year),
      ]);

    return {
      data: toPlainObject({
        consolidatedBalance,
        month,
        year,
        summaryByCategory,
        categories,
        budgetProgress,
      }),
    };
  } catch (err) {
    return { error: mapError(err) };
  }
}

function mapError(err: unknown): string {
  if (err instanceof UnauthenticatedError) {
    return "não autenticado";
  }
  throw err;
}

"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { dashboardService } from "@/services/dashboard.service";
import { categoryService } from "@/services/category.service";
import { budgetService } from "@/services/budget.service";
import { recurringTransactionService } from "@/services/recurring-transaction.service";
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
  availableBalance: number;
  month: number;
  year: number;
  summaryByCategory: {
    categoryId: string | null;
    income: number;
    expense: number;
  }[];
  categories: unknown[];
  budgetProgress: unknown[];
  pendingTransactions: unknown[];
  monthlyComparison: unknown[];
  balanceProjection: unknown[];
  dailyExpenses: Record<string, number>;
  spendableToday: number;
  healthScore: { score: number; savingsRate: number; goalsActive: number; hasOverdue: boolean };
}

export async function getDashboardDataAction(params?: { month?: number; year?: number }): Promise<ActionResult<DashboardData>> {
  try {
    const userId = await requireUserId();
    const now = new Date();
    const month = params?.month ?? (now.getUTCMonth() + 1);
    const year = params?.year ?? now.getUTCFullYear();

    const [balanceResult, summaryByCategory, categories, budgetProgress, pendingTransactions, monthlyComparison, recurringItems, dailyExpenses, healthScore] =
      await Promise.all([
        dashboardService.getConsolidatedBalance(userId),
        dashboardService.getMonthlySummaryByCategory(userId, month, year),
        categoryService.listCategories(userId),
        budgetService.getMonthlyBudgetProgress(userId, month, year),
        dashboardService.getPendingTransactions(userId),
        dashboardService.getMonthlyComparison(userId, 6),
        recurringTransactionService.list(userId),
        dashboardService.getDailyExpenses(userId, month, year),
        dashboardService.getHealthScore(userId, month, year),
      ]);

    const activeRecurring = (recurringItems as { isActive: boolean; type: string; amountCents: number; nextDueDate: Date; frequency: string }[])
      .filter((r) => r.isActive);

    const pendingRecurringCents = activeRecurring
      .filter((r) => r.type === "EXPENSE")
      .reduce((s, r) => s + r.amountCents, 0);

    const [balanceProjection, spendableToday] = await Promise.all([
      activeRecurring.length > 0
        ? dashboardService.getBalanceProjection(userId, balanceResult.total, activeRecurring)
        : Promise.resolve([]),
      dashboardService.getSpendableToday(userId, balanceResult.available, pendingRecurringCents),
    ]);

    return {
      data: toPlainObject({
        consolidatedBalance: balanceResult.total,
        availableBalance: balanceResult.available,
        month,
        year,
        summaryByCategory,
        categories,
        budgetProgress,
        pendingTransactions,
        monthlyComparison,
        balanceProjection,
        dailyExpenses,
        spendableToday,
        healthScore,
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

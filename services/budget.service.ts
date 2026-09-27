import { budgetRepository } from "@/repositories/budget.repository";
import { categoryRepository } from "@/repositories/category.repository";
import { dashboardService } from "@/services/dashboard.service";

export class InvalidBudgetLimitError extends Error {
  constructor() {
    super("Budget limit must be greater than zero");
    this.name = "InvalidBudgetLimitError";
  }
}

export class CategoryNotFoundError extends Error {
  constructor() {
    super("Category not found");
    this.name = "CategoryNotFoundError";
  }
}

export interface BudgetProgress {
  categoryId: string;
  limitCents: number;
  spentCents: number;
  percentage: number;
  overLimit: boolean;
}

function assertValidLimit(limitCents: number) {
  if (!(limitCents > 0)) {
    throw new InvalidBudgetLimitError();
  }
}

export const budgetService = {
  /** BUD-01 AC1/AC5: saves a recurring monthly limit for a category owned by the user. */
  async setBudget(userId: string, categoryId: string, limitCents: number) {
    assertValidLimit(limitCents);

    const category = await categoryRepository.findById(userId, categoryId);
    if (!category) {
      throw new CategoryNotFoundError();
    }

    return budgetRepository.upsert(userId, categoryId, limitCents);
  },

  /**
   * BUD-01 AC2/AC3/AC4: for every category that has a budget set, returns how
   * much of its limit was spent (paid EXPENSE) in the given month. Categories
   * without a budget are simply absent from the result (no progress
   * indicator).
   */
  async getMonthlyBudgetProgress(
    userId: string,
    month: number,
    year: number
  ): Promise<BudgetProgress[]> {
    const budgets = await budgetRepository.list(userId);
    if (budgets.length === 0) {
      return [];
    }

    const summary = await dashboardService.getMonthlySummaryByCategory(userId, month, year);
    const spentByCategory = new Map(summary.map((item) => [item.categoryId, item.expense]));

    return budgets.map((budget) => {
      const categoryId = String(budget.categoryId);
      const spentCents = spentByCategory.get(categoryId) ?? 0;
      const percentage = Math.round((spentCents / budget.limitCents) * 100);
      return {
        categoryId,
        limitCents: budget.limitCents,
        spentCents,
        percentage,
        overLimit: spentCents > budget.limitCents,
      };
    });
  },
};

export default budgetService;

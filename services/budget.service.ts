import { budgetRepository } from "@/repositories/budget.repository";
import { budgetGroupRepository } from "@/repositories/budget-group.repository";
import { categoryRepository } from "@/repositories/category.repository";
import { dashboardService } from "@/services/dashboard.service";
import { budgetGroupService, CategoryInBudgetGroupError } from "@/services/budget-group.service";

export { CategoryInBudgetGroupError };

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

export interface SoloBudgetProgress {
  kind: "solo";
  categoryId: string;
  limitCents: number;
  spentCents: number;
  percentage: number;
  overLimit: boolean;
}

export interface GroupBudgetSegment {
  categoryId: string;
  name: string;
  color: string;
  spentCents: number;
  widthPercent: number;
  sharePercent: number;
}

export interface GroupBudgetProgress {
  kind: "group";
  groupId: string;
  name: string;
  limitCents: number;
  spentCents: number;
  percentage: number;
  overLimit: boolean;
  segments: GroupBudgetSegment[];
}

export type BudgetProgressItem = SoloBudgetProgress | GroupBudgetProgress;

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

    if (await budgetGroupService.isCategoryInGroup(userId, categoryId)) {
      throw new CategoryInBudgetGroupError();
    }

    return budgetRepository.upsert(userId, categoryId, limitCents);
  },

  async getMonthlyBudgetProgress(
    userId: string,
    month: number,
    year: number
  ): Promise<BudgetProgressItem[]> {
    const [budgets, groups, categories, summary] = await Promise.all([
      budgetRepository.list(userId),
      budgetGroupRepository.list(userId),
      categoryRepository.list(userId),
      dashboardService.getMonthlySummaryByCategory(userId, month, year),
    ]);

    if (budgets.length === 0 && groups.length === 0) {
      return [];
    }

    const spentByCategory = new Map(summary.map((item) => [item.categoryId, item.expense]));
    const categoryById = new Map(categories.map((c) => [String(c._id), c]));
    const groupedCategoryIds = new Set(
      groups.flatMap((g) => g.categoryIds.map((id: unknown) => String(id)))
    );

    const groupProgress: GroupBudgetProgress[] = groups.map((group) => {
      const limitCents = group.limitCents;
      const memberIds = group.categoryIds.map((id: unknown) => String(id));
      const segmentsRaw = memberIds.map((categoryId: string) => {
        const meta = categoryById.get(categoryId);
        const spentCents = spentByCategory.get(categoryId) ?? 0;
        return {
          categoryId,
          name: meta?.name ?? "Categoria",
          color: meta?.color ?? "#888888",
          spentCents,
          widthPercent: limitCents > 0 ? (spentCents / limitCents) * 100 : 0,
        };
      });
      segmentsRaw.sort((a: (typeof segmentsRaw)[number], b: (typeof segmentsRaw)[number]) =>
        a.name.localeCompare(b.name, "pt-BR")
      );
      const spentCents = segmentsRaw.reduce(
        (sum: number, s: (typeof segmentsRaw)[number]) => sum + s.spentCents,
        0
      );
      const shareDenominator = spentCents > 0 ? spentCents : 1;
      const fillPercent = limitCents > 0 ? Math.min(100, (spentCents / limitCents) * 100) : 0;
      const segments: GroupBudgetSegment[] = segmentsRaw.map((s: (typeof segmentsRaw)[number]) => ({
        ...s,
        sharePercent:
          spentCents > 0 ? (s.spentCents / shareDenominator) * fillPercent : 0,
      }));

      return {
        kind: "group" as const,
        groupId: String(group._id),
        name: group.name,
        limitCents,
        spentCents,
        percentage: limitCents > 0 ? Math.round((spentCents / limitCents) * 100) : 0,
        overLimit: spentCents > limitCents,
        segments,
      };
    });

    groupProgress.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    const soloProgress: SoloBudgetProgress[] = budgets
      .filter((budget) => !groupedCategoryIds.has(String(budget.categoryId)))
      .map((budget) => {
        const categoryId = String(budget.categoryId);
        const spentCents = spentByCategory.get(categoryId) ?? 0;
        const percentage = Math.round((spentCents / budget.limitCents) * 100);
        return {
          kind: "solo" as const,
          categoryId,
          limitCents: budget.limitCents,
          spentCents,
          percentage,
          overLimit: spentCents > budget.limitCents,
        };
      });

    soloProgress.sort((a, b) => {
      const nameA = categoryById.get(a.categoryId)?.name ?? "";
      const nameB = categoryById.get(b.categoryId)?.name ?? "";
      return nameA.localeCompare(nameB, "pt-BR");
    });

    return [...groupProgress, ...soloProgress];
  },
};

export default budgetService;

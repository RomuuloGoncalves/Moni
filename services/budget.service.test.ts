import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/connect", () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/repositories/budget.repository", () => ({
  budgetRepository: {
    upsert: vi.fn(),
    list: vi.fn(),
    findByCategory: vi.fn(),
  },
}));

vi.mock("@/repositories/category.repository", () => ({
  categoryRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/services/dashboard.service", () => ({
  dashboardService: {
    getMonthlySummaryByCategory: vi.fn(),
  },
}));

import { budgetRepository } from "@/repositories/budget.repository";
import { categoryRepository } from "@/repositories/category.repository";
import { dashboardService } from "@/services/dashboard.service";
import {
  budgetService,
  InvalidBudgetLimitError,
  CategoryNotFoundError,
} from "@/services/budget.service";

const budgetRepo = vi.mocked(budgetRepository);
const categoryRepo = vi.mocked(categoryRepository);
const dashSvc = vi.mocked(dashboardService);

describe("budgetService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("BUD-01 AC5: rejects a limit of zero or less", async () => {
    await expect(budgetService.setBudget("user1", "cat1", 0)).rejects.toBeInstanceOf(
      InvalidBudgetLimitError
    );
    await expect(budgetService.setBudget("user1", "cat1", -100)).rejects.toBeInstanceOf(
      InvalidBudgetLimitError
    );
    expect(budgetRepo.upsert).not.toHaveBeenCalled();
  });

  it("rejects setting a budget for a category not owned by the user", async () => {
    categoryRepo.findById.mockResolvedValue(null);

    await expect(budgetService.setBudget("user1", "cat1", 50000)).rejects.toBeInstanceOf(
      CategoryNotFoundError
    );
    expect(budgetRepo.upsert).not.toHaveBeenCalled();
  });

  it("BUD-01 AC1: saves a valid limit for an owned category", async () => {
    categoryRepo.findById.mockResolvedValue({ _id: "cat1", userId: "user1" } as never);
    budgetRepo.upsert.mockResolvedValue({ categoryId: "cat1", limitCents: 50000 } as never);

    const result = await budgetService.setBudget("user1", "cat1", 50000);

    expect(budgetRepo.upsert).toHaveBeenCalledWith("user1", "cat1", 50000);
    expect(result).toMatchObject({ limitCents: 50000 });
  });

  it("BUD-01 AC4: a category without a budget is absent from the progress result", async () => {
    budgetRepo.list.mockResolvedValue([]);

    const progress = await budgetService.getMonthlyBudgetProgress("user1", 3, 2026);

    expect(progress).toEqual([]);
    expect(dashSvc.getMonthlySummaryByCategory).not.toHaveBeenCalled();
  });

  it("BUD-01 AC3: reports the percentage consumed while under the limit", async () => {
    budgetRepo.list.mockResolvedValue([
      { categoryId: "catFood", limitCents: 50000 },
    ] as never);
    dashSvc.getMonthlySummaryByCategory.mockResolvedValue([
      { categoryId: "catFood", income: 0, expense: 36000 },
    ]);

    const [progress] = await budgetService.getMonthlyBudgetProgress("user1", 3, 2026);

    expect(progress).toEqual({
      categoryId: "catFood",
      limitCents: 50000,
      spentCents: 36000,
      percentage: 72,
      overLimit: false,
    });
  });

  it("BUD-01 AC2: flags a category as over limit when the spend exceeds it", async () => {
    budgetRepo.list.mockResolvedValue([
      { categoryId: "catFood", limitCents: 50000 },
    ] as never);
    dashSvc.getMonthlySummaryByCategory.mockResolvedValue([
      { categoryId: "catFood", income: 0, expense: 60000 },
    ]);

    const [progress] = await budgetService.getMonthlyBudgetProgress("user1", 3, 2026);

    expect(progress.overLimit).toBe(true);
    expect(progress.percentage).toBe(120);
  });
});

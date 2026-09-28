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

vi.mock("@/repositories/budget-group.repository", () => ({
  budgetGroupRepository: {
    list: vi.fn(),
  },
}));

vi.mock("@/repositories/category.repository", () => ({
  categoryRepository: {
    findById: vi.fn(),
    list: vi.fn(),
  },
}));

vi.mock("@/services/dashboard.service", () => ({
  dashboardService: {
    getMonthlySummaryByCategory: vi.fn(),
  },
}));

vi.mock("@/services/budget-group.service", () => ({
  budgetGroupService: {
    isCategoryInGroup: vi.fn(),
  },
  CategoryInBudgetGroupError: class CategoryInBudgetGroupError extends Error {
    constructor() {
      super("Category is already in a budget group");
      this.name = "CategoryInBudgetGroupError";
    }
  },
}));

import { budgetRepository } from "@/repositories/budget.repository";
import { budgetGroupRepository } from "@/repositories/budget-group.repository";
import { categoryRepository } from "@/repositories/category.repository";
import { dashboardService } from "@/services/dashboard.service";
import { budgetGroupService, CategoryInBudgetGroupError } from "@/services/budget-group.service";
import {
  budgetService,
  InvalidBudgetLimitError,
  CategoryNotFoundError,
} from "@/services/budget.service";

const budgetRepo = vi.mocked(budgetRepository);
const budgetGroupRepo = vi.mocked(budgetGroupRepository);
const categoryRepo = vi.mocked(categoryRepository);
const dashSvc = vi.mocked(dashboardService);
const groupSvc = vi.mocked(budgetGroupService);

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

  it("rejects solo budget when category is in a group", async () => {
    categoryRepo.findById.mockResolvedValue({ _id: "cat1", userId: "user1" } as never);
    groupSvc.isCategoryInGroup.mockResolvedValue(true);

    await expect(budgetService.setBudget("user1", "cat1", 50000)).rejects.toBeInstanceOf(
      CategoryInBudgetGroupError
    );
    expect(budgetRepo.upsert).not.toHaveBeenCalled();
  });

  it("BUD-01 AC1: saves a valid limit for an owned category", async () => {
    categoryRepo.findById.mockResolvedValue({ _id: "cat1", userId: "user1" } as never);
    groupSvc.isCategoryInGroup.mockResolvedValue(false);
    budgetRepo.upsert.mockResolvedValue({ categoryId: "cat1", limitCents: 50000 } as never);

    const result = await budgetService.setBudget("user1", "cat1", 50000);

    expect(budgetRepo.upsert).toHaveBeenCalledWith("user1", "cat1", 50000);
    expect(result).toMatchObject({ limitCents: 50000 });
  });

  it("BUD-01 AC4: a category without a budget is absent from the progress result", async () => {
    budgetRepo.list.mockResolvedValue([]);
    budgetGroupRepo.list.mockResolvedValue([]);

    const progress = await budgetService.getMonthlyBudgetProgress("user1", 3, 2026);

    expect(progress).toEqual([]);
    expect(dashSvc.getMonthlySummaryByCategory).not.toHaveBeenCalled();
  });

  it("BUD-01 AC3: reports solo percentage consumed while under the limit", async () => {
    budgetRepo.list.mockResolvedValue([{ categoryId: "catFood", limitCents: 50000 }] as never);
    budgetGroupRepo.list.mockResolvedValue([]);
    categoryRepo.list.mockResolvedValue([
      { _id: "catFood", name: "Comida", color: "#f00" },
    ] as never);
    dashSvc.getMonthlySummaryByCategory.mockResolvedValue([
      { categoryId: "catFood", income: 0, expense: 36000 },
    ]);

    const [progress] = await budgetService.getMonthlyBudgetProgress("user1", 3, 2026);

    expect(progress).toEqual({
      kind: "solo",
      categoryId: "catFood",
      limitCents: 50000,
      spentCents: 36000,
      percentage: 72,
      overLimit: false,
    });
  });

  it("BUD-01 AC2: flags a solo category as over limit when the spend exceeds it", async () => {
    budgetRepo.list.mockResolvedValue([{ categoryId: "catFood", limitCents: 50000 }] as never);
    budgetGroupRepo.list.mockResolvedValue([]);
    categoryRepo.list.mockResolvedValue([
      { _id: "catFood", name: "Comida", color: "#f00" },
    ] as never);
    dashSvc.getMonthlySummaryByCategory.mockResolvedValue([
      { categoryId: "catFood", income: 0, expense: 60000 },
    ]);

    const [progress] = await budgetService.getMonthlyBudgetProgress("user1", 3, 2026);

    expect(progress.kind).toBe("solo");
    if (progress.kind === "solo") {
      expect(progress.overLimit).toBe(true);
      expect(progress.percentage).toBe(120);
    }
  });

  it("aggregates group spend and builds stacked segments", async () => {
    budgetRepo.list.mockResolvedValue([]);
    budgetGroupRepo.list.mockResolvedValue([
      {
        _id: "grp1",
        name: "Alimentação",
        limitCents: 100000,
        categoryIds: ["catMercado", "catRefeicao"],
      },
    ] as never);
    categoryRepo.list.mockResolvedValue([
      { _id: "catMercado", name: "Mercado", color: "#111111" },
      { _id: "catRefeicao", name: "Refeição", color: "#222222" },
    ] as never);
    dashSvc.getMonthlySummaryByCategory.mockResolvedValue([
      { categoryId: "catMercado", income: 0, expense: 30000 },
      { categoryId: "catRefeicao", income: 0, expense: 20000 },
    ]);

    const [progress] = await budgetService.getMonthlyBudgetProgress("user1", 3, 2026);

    expect(progress.kind).toBe("group");
    if (progress.kind === "group") {
      expect(progress.spentCents).toBe(50000);
      expect(progress.percentage).toBe(50);
      expect(progress.overLimit).toBe(false);
      expect(progress.segments).toHaveLength(2);
      const mercado = progress.segments.find((s) => s.categoryId === "catMercado");
      expect(mercado?.spentCents).toBe(30000);
      expect(mercado?.sharePercent).toBeCloseTo(30, 5);
    }
  });

  it("excludes solo budgets for categories that belong to a group", async () => {
    budgetRepo.list.mockResolvedValue([
      { categoryId: "catMercado", limitCents: 99999 },
    ] as never);
    budgetGroupRepo.list.mockResolvedValue([
      {
        _id: "grp1",
        name: "Alimentação",
        limitCents: 100000,
        categoryIds: ["catMercado", "catRefeicao"],
      },
    ] as never);
    categoryRepo.list.mockResolvedValue([
      { _id: "catMercado", name: "Mercado", color: "#111" },
      { _id: "catRefeicao", name: "Refeição", color: "#222" },
    ] as never);
    dashSvc.getMonthlySummaryByCategory.mockResolvedValue([]);

    const progress = await budgetService.getMonthlyBudgetProgress("user1", 3, 2026);

    expect(progress).toHaveLength(1);
    expect(progress[0].kind).toBe("group");
  });
});

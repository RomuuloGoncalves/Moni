import { budgetGroupRepository } from "@/repositories/budget-group.repository";
import { budgetRepository } from "@/repositories/budget.repository";
import { categoryRepository } from "@/repositories/category.repository";
import { CategoryNotFoundError } from "@/services/category.service";

class InvalidBudgetLimitError extends Error {
  constructor() {
    super("Budget limit must be greater than zero");
    this.name = "InvalidBudgetLimitError";
  }
}

export class DuplicateBudgetGroupNameError extends Error {
  constructor() {
    super("A budget group with this name already exists");
    this.name = "DuplicateBudgetGroupNameError";
  }
}

export class BudgetGroupNotFoundError extends Error {
  constructor() {
    super("Budget group not found");
    this.name = "BudgetGroupNotFoundError";
  }
}

export class InvalidBudgetGroupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidBudgetGroupError";
  }
}

export class CategoryInBudgetGroupError extends Error {
  constructor() {
    super("Category is already in a budget group");
    this.name = "CategoryInBudgetGroupError";
  }
}

function assertValidLimit(limitCents: number) {
  if (!(limitCents > 0)) {
    throw new InvalidBudgetLimitError();
  }
}

function assertValidName(name: string) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 60) {
    throw new InvalidBudgetGroupError("Group name must be 1–60 characters");
  }
}

async function assertCategoriesOwned(userId: string, categoryIds: string[]) {
  const unique = [...new Set(categoryIds)];
  if (unique.length !== categoryIds.length) {
    throw new InvalidBudgetGroupError("Duplicate categories in group");
  }
  if (unique.length < 2) {
    throw new InvalidBudgetGroupError("A budget group needs at least two categories");
  }
  for (const categoryId of unique) {
    const category = await categoryRepository.findById(userId, categoryId);
    if (!category) {
      throw new CategoryNotFoundError();
    }
  }
  return unique;
}

async function assertNoCategoryConflict(
  userId: string,
  categoryIds: string[],
  excludeGroupId?: string
) {
  const conflicts = await budgetGroupRepository.findContainingCategories(
    userId,
    categoryIds,
    excludeGroupId
  );
  if (conflicts.length > 0) {
    throw new CategoryInBudgetGroupError();
  }
}

async function clearIndividualBudgets(userId: string, categoryIds: string[]) {
  await budgetRepository.deleteByCategories(userId, categoryIds);
}

export const budgetGroupService = {
  async listGroups(userId: string) {
    return budgetGroupRepository.list(userId);
  },

  async createGroup(
    userId: string,
    input: { name: string; limitCents: number; categoryIds: string[] }
  ) {
    assertValidName(input.name);
    assertValidLimit(input.limitCents);
    const categoryIds = await assertCategoriesOwned(userId, input.categoryIds);
    await assertNoCategoryConflict(userId, categoryIds);
    await clearIndividualBudgets(userId, categoryIds);
    try {
      return await budgetGroupRepository.create(userId, {
        name: input.name.trim(),
        limitCents: input.limitCents,
        categoryIds,
      });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === 11000) {
        throw new DuplicateBudgetGroupNameError();
      }
      throw err;
    }
  },

  async updateGroup(
    userId: string,
    groupId: string,
    input: { name?: string; limitCents?: number; categoryIds?: string[] }
  ) {
    const existing = await budgetGroupRepository.findById(userId, groupId);
    if (!existing) {
      throw new BudgetGroupNotFoundError();
    }
    if (input.limitCents !== undefined) {
      assertValidLimit(input.limitCents);
    }
    if (input.name !== undefined) {
      assertValidName(input.name);
    }

    let categoryIds: string[] | undefined;
    if (input.categoryIds !== undefined) {
      categoryIds = await assertCategoriesOwned(userId, input.categoryIds);
      await assertNoCategoryConflict(userId, categoryIds, groupId);
      await clearIndividualBudgets(userId, categoryIds);
    }

    try {
      const updated = await budgetGroupRepository.update(userId, groupId, {
        name: input.name?.trim(),
        limitCents: input.limitCents,
        categoryIds,
      });
      if (!updated) {
        throw new BudgetGroupNotFoundError();
      }
      return updated;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === 11000) {
        throw new DuplicateBudgetGroupNameError();
      }
      throw err;
    }
  },

  async deleteGroup(userId: string, groupId: string) {
    const existing = await budgetGroupRepository.findById(userId, groupId);
    if (!existing) {
      throw new BudgetGroupNotFoundError();
    }
    await budgetGroupRepository.delete(userId, groupId);
  },

  async isCategoryInGroup(userId: string, categoryId: string): Promise<boolean> {
    const groups = await budgetGroupRepository.findContainingCategories(userId, [categoryId]);
    return groups.length > 0;
  },

  async onCategoryDeleted(userId: string, categoryId: string) {
    await budgetGroupRepository.removeCategoryFromGroups(userId, categoryId);
  },
};

export default budgetGroupService;

import {
  categoryRepository,
  DuplicateCategoryError,
} from "@/repositories/category.repository";
import { transactionRepository } from "@/repositories/transaction.repository";

export { DuplicateCategoryError };

export class InvalidCategoryNameError extends Error {
  constructor() {
    super("Category name must not be empty and must be at most 60 characters");
    this.name = "InvalidCategoryNameError";
  }
}

export class CategoryHasTransactionsError extends Error {
  constructor() {
    super("Cannot delete a category that has transactions linked to it");
    this.name = "CategoryHasTransactionsError";
  }
}

export class CategoryNotFoundError extends Error {
  constructor() {
    super("Category not found");
    this.name = "CategoryNotFoundError";
  }
}

export interface CreateCategoryInput {
  name: string;
  color: string;
  iconType: string;
}

function assertValidName(name: string) {
  if (!name || name.trim().length === 0 || name.length > 60) {
    throw new InvalidCategoryNameError();
  }
}

/** Checks whether any transaction references this category. */
async function categoryHasTransactions(categoryId: string): Promise<boolean> {
  return transactionRepository.existsFor({ categoryId });
}

export const categoryService = {
  async createCategory(userId: string, input: CreateCategoryInput) {
    assertValidName(input.name);
    try {
      return await categoryRepository.create({
        userId,
        name: input.name,
        color: input.color,
        iconType: input.iconType,
      });
    } catch (err) {
      if (err instanceof DuplicateCategoryError) {
        throw err;
      }
      throw err;
    }
  },

  async updateCategory(
    userId: string,
    categoryId: string,
    input: CreateCategoryInput
  ) {
    assertValidName(input.name);
    
    // Check if category exists
    const existing = await categoryRepository.findById(userId, categoryId);
    if (!existing) {
      throw new CategoryNotFoundError();
    }

    try {
      return await categoryRepository.update(userId, categoryId, {
        name: input.name,
        color: input.color,
        iconType: input.iconType,
      });
    } catch (err) {
      if (err instanceof DuplicateCategoryError) {
        throw err;
      }
      throw err;
    }
  },

  async listCategories(userId: string) {
    return categoryRepository.list(userId);
  },

  async deleteCategory(userId: string, categoryId: string) {
    const existing = await categoryRepository.findById(userId, categoryId);
    if (!existing) {
      throw new CategoryNotFoundError();
    }
    if (await categoryHasTransactions(categoryId)) {
      throw new CategoryHasTransactionsError();
    }
    const { budgetGroupService } = await import("@/services/budget-group.service");
    await budgetGroupService.onCategoryDeleted(userId, categoryId);
    await categoryRepository.delete(userId, categoryId);
  },
};

export default categoryService;

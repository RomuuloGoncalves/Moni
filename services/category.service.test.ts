import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/connect", () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/repositories/category.repository", () => ({
  categoryRepository: {
    create: vi.fn(),
    list: vi.fn(),
    findById: vi.fn(),
    delete: vi.fn(),
  },
  DuplicateCategoryError: class DuplicateCategoryError extends Error {},
}));

vi.mock("@/repositories/transaction.repository", () => ({
  transactionRepository: {
    existsFor: vi.fn(),
  },
}));

import { categoryRepository, DuplicateCategoryError } from "@/repositories/category.repository";
import { transactionRepository } from "@/repositories/transaction.repository";
import {
  categoryService,
  InvalidCategoryNameError,
  CategoryHasTransactionsError,
  CategoryNotFoundError,
} from "@/services/category.service";

const repo = vi.mocked(categoryRepository);
const txnRepo = vi.mocked(transactionRepository);

describe("categoryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("CAT-01 AC2: rejects category name longer than 60 chars", async () => {
    const longName = "a".repeat(61);
    await expect(
      categoryService.createCategory("user1", { name: longName, color: "#fff", iconType: "x" })
    ).rejects.toBeInstanceOf(InvalidCategoryNameError);
  });

  it("CAT-01 AC2: propagates DuplicateCategoryError from the repository", async () => {
    repo.create.mockRejectedValue(new DuplicateCategoryError("Alimentação"));
    await expect(
      categoryService.createCategory("user1", {
        name: "Alimentação",
        color: "#fff",
        iconType: "x",
      })
    ).rejects.toBeInstanceOf(DuplicateCategoryError);
  });

  it("creates a category with a valid, unique name", async () => {
    repo.create.mockResolvedValue({ _id: "507f1f77bcf86cd799439012", name: "Lazer" });
    const result = await categoryService.createCategory("user1", {
      name: "Lazer",
      color: "#000",
      iconType: "game",
    });
    expect(result).toMatchObject({ name: "Lazer" });
  });

  it("CAT-01 AC3: deleteCategory blocked when dependent transactions exist", async () => {
    repo.findById.mockResolvedValue({ _id: "507f1f77bcf86cd799439012", userId: "user1" });
    txnRepo.existsFor.mockResolvedValue(true);

    await expect(categoryService.deleteCategory("user1", "507f1f77bcf86cd799439012")).rejects.toBeInstanceOf(
      CategoryHasTransactionsError
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("deleteCategory succeeds when there are no dependent transactions", async () => {
    repo.findById.mockResolvedValue({ _id: "507f1f77bcf86cd799439012", userId: "user1" });
    txnRepo.existsFor.mockResolvedValue(false);
    repo.delete.mockResolvedValue(true);

    await categoryService.deleteCategory("user1", "507f1f77bcf86cd799439012");

    expect(repo.delete).toHaveBeenCalledWith("user1", "507f1f77bcf86cd799439012");
  });

  it("CAT-01 AC4: deleteCategory throws CategoryNotFoundError when not owned by user", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(categoryService.deleteCategory("user1", "507f1f77bcf86cd799439012")).rejects.toBeInstanceOf(
      CategoryNotFoundError
    );
  });

  it("CAT-01 AC4: listCategories delegates to repository scoped by userId", async () => {
    repo.list.mockResolvedValue([{ _id: "507f1f77bcf86cd799439012" }]);
    const result = await categoryService.listCategories("user1");
    expect(repo.list).toHaveBeenCalledWith("user1");
    expect(result).toHaveLength(1);
  });
});

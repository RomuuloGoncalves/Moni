import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/connect", () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/repositories/merchant-category-rule.repository", () => ({
  merchantCategoryRuleRepository: {
    upsert: vi.fn(),
    findByMerchantKey: vi.fn(),
    listByUser: vi.fn(),
    listUncategorizedMerchants: vi.fn(),
    bulkSetCategoryForMerchant: vi.fn(),
  },
}));

vi.mock("@/repositories/category.repository", () => ({
  categoryRepository: {
    findById: vi.fn(),
  },
}));

import { merchantCategoryRuleRepository } from "@/repositories/merchant-category-rule.repository";
import { categoryRepository } from "@/repositories/category.repository";
import {
  merchantCategoryRuleService,
  CategoryNotFoundError,
} from "@/services/merchant-category-rule.service";

const repo = vi.mocked(merchantCategoryRuleRepository);
const catRepo = vi.mocked(categoryRepository);

describe("merchantCategoryRuleService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("CAT-02 AC1: upsertRuleFromCategorization normalizes description and upserts the rule", async () => {
    repo.upsert.mockResolvedValue({ merchantKey: "uber *trip" });
    await merchantCategoryRuleService.upsertRuleFromCategorization(
      "user1",
      "  UBER *Trip   ",
      "cat1"
    );
    expect(repo.upsert).toHaveBeenCalledWith("user1", "uber *trip", "cat1");
  });

  it("CAT-02 AC2/AC3: suggestCategory returns the known categoryId for a matching merchantKey", async () => {
    repo.findByMerchantKey.mockResolvedValue({ categoryId: "cat1" });
    const result = await merchantCategoryRuleService.suggestCategory("user1", "UBER *Trip");
    expect(repo.findByMerchantKey).toHaveBeenCalledWith("user1", "uber *trip");
    expect(result).toBe("cat1");
  });

  it("CAT-02 AC4: suggestCategory returns null when there is no rule, never guessing", async () => {
    repo.findByMerchantKey.mockResolvedValue(null);
    const result = await merchantCategoryRuleService.suggestCategory("user1", "Loja Desconhecida");
    expect(result).toBeNull();
  });

  it("CAT-02 AC7: categorizeMerchant on a merchant with no prior rule upserts and reapplies retroactively", async () => {
    catRepo.findById.mockResolvedValue({ _id: "cat1" });
    repo.upsert.mockResolvedValue({ merchantKey: "ifood", categoryId: "cat1" });
    repo.bulkSetCategoryForMerchant.mockResolvedValue(3);

    const result = await merchantCategoryRuleService.categorizeMerchant("user1", "ifood", "cat1");

    expect(repo.upsert).toHaveBeenCalledWith("user1", "ifood", "cat1");
    expect(repo.bulkSetCategoryForMerchant).toHaveBeenCalledWith("user1", "ifood", "cat1");
    expect(result.updatedCount).toBe(3);
  });

  it("CAT-02 AC9: categorizeMerchant on an existing rule (edit) still reapplies to all transactions with that merchantKey", async () => {
    catRepo.findById.mockResolvedValue({ _id: "cat2" });
    repo.upsert.mockResolvedValue({ merchantKey: "ifood", categoryId: "cat2" });
    repo.bulkSetCategoryForMerchant.mockResolvedValue(5);

    const result = await merchantCategoryRuleService.categorizeMerchant("user1", "ifood", "cat2");

    expect(repo.bulkSetCategoryForMerchant).toHaveBeenCalledWith("user1", "ifood", "cat2");
    expect(result.updatedCount).toBe(5);
  });

  it("categorizeMerchant rejects a categoryId that does not belong to the user", async () => {
    catRepo.findById.mockResolvedValue(null);
    await expect(
      merchantCategoryRuleService.categorizeMerchant("user1", "ifood", "not-mine")
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it("CAT-02 AC10: listUncategorizedMerchants/listExistingRules delegate scoped by userId", async () => {
    repo.listUncategorizedMerchants.mockResolvedValue([]);
    repo.listByUser.mockResolvedValue([]);

    await merchantCategoryRuleService.listUncategorizedMerchants("user1");
    await merchantCategoryRuleService.listExistingRules("user1");

    expect(repo.listUncategorizedMerchants).toHaveBeenCalledWith("user1");
    expect(repo.listByUser).toHaveBeenCalledWith("user1");
  });
});

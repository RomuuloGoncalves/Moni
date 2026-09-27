import { merchantCategoryRuleRepository } from "@/repositories/merchant-category-rule.repository";
import { categoryRepository } from "@/repositories/category.repository";
import { normalizeMerchantKey } from "@/lib/import/normalize";

export { normalizeMerchantKey };

export class CategoryNotFoundError extends Error {
  constructor() {
    super("Category not found");
    this.name = "CategoryNotFoundError";
  }
}

export const merchantCategoryRuleService = {
  normalizeMerchantKey,

  /**
   * Called whenever the user manually categorizes an EXPENSE/INCOME
   * transaction (create or edit) — upserts the merchantKey -> categoryId
   * rule for this user (CAT-02 AC1, AC5).
   */
  async upsertRuleFromCategorization(userId: string, description: string, categoryId: string) {
    const merchantKey = normalizeMerchantKey(description);
    return merchantCategoryRuleRepository.upsert(userId, merchantKey, categoryId);
  },

  /**
   * Looks up a known rule for this description's merchantKey. Returns null
   * when there is none — CAT-02 never guesses (AC4).
   */
  async suggestCategory(userId: string, description: string): Promise<string | null> {
    const merchantKey = normalizeMerchantKey(description);
    const rule = await merchantCategoryRuleRepository.findByMerchantKey(userId, merchantKey);
    return rule ? String(rule.categoryId) : null;
  },

  async listUncategorizedMerchants(userId: string) {
    return merchantCategoryRuleRepository.listUncategorizedMerchants(userId);
  },

  async listExistingRules(userId: string) {
    return merchantCategoryRuleRepository.listByUser(userId);
  },

  /**
   * Upserts the rule for `merchantKey` and always reapplies it retroactively
   * to every existing transaction of this user with that merchantKey — both
   * for a brand-new rule (CAT-02 AC7) and when editing an existing one
   * (CAT-02 AC9, including transactions that carried the old category).
   */
  async categorizeMerchant(userId: string, merchantKey: string, categoryId: string) {
    const category = await categoryRepository.findById(userId, categoryId);
    if (!category) {
      throw new CategoryNotFoundError();
    }

    const rule = await merchantCategoryRuleRepository.upsert(userId, merchantKey, categoryId);
    const updatedCount = await merchantCategoryRuleRepository.bulkSetCategoryForMerchant(
      userId,
      merchantKey,
      categoryId
    );

    return { rule, updatedCount };
  },
};

export default merchantCategoryRuleService;

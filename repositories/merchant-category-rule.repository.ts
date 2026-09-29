import { connectDB } from "@/lib/db/connect";
import { MerchantCategoryRule } from "@/models/MerchantCategoryRule";
import { Category } from "@/models/Category";
import { Transaction } from "@/models/Transaction";
import { normalizeMerchantKey } from "@/lib/import/normalize";

export interface UncategorizedMerchant {
  merchantKey: string;
  sampleDescription: string;
  affectedCount: number;
}

export interface MerchantRuleWithCategory {
  _id: string;
  merchantKey: string;
  categoryId: string;
  categoryName: string;
  updatedAt: Date;
}

export const merchantCategoryRuleRepository = {
  async upsert(userId: string, merchantKey: string, categoryId: string) {
    await connectDB();
    const doc = await MerchantCategoryRule.findOneAndUpdate(
      { userId, merchantKey },
      { $set: { categoryId, updatedAt: new Date() } },
      { upsert: true, returnDocument: "after" }
    ).lean();
    return doc;
  },

  async findByMerchantKey(userId: string, merchantKey: string) {
    await connectDB();
    const doc = await MerchantCategoryRule.findOne({ userId, merchantKey }).lean();
    return doc;
  },

  async listByUser(userId: string): Promise<MerchantRuleWithCategory[]> {
    await connectDB();
    const rules = await MerchantCategoryRule.find({ userId }).sort({ updatedAt: -1 }).lean();
    const categoryIds = rules.map((r) => r.categoryId);
    const categories = await Category.find({ _id: { $in: categoryIds } }).lean();
    const categoryNameById = new Map(categories.map((c) => [String(c._id), c.name]));
    return rules.map((r) => ({
      _id: String(r._id),
      merchantKey: r.merchantKey,
      categoryId: String(r.categoryId),
      categoryName: categoryNameById.get(String(r.categoryId)) ?? "Categoria removida",
      updatedAt: r.updatedAt,
    }));
  },

  async listUncategorizedMerchants(userId: string): Promise<UncategorizedMerchant[]> {
    await connectDB();
    const candidates = await Transaction.find({
      userId,
      type: { $in: ["EXPENSE", "INCOME"] },
      $or: [{ categoryId: { $exists: false } }, { categoryId: null }],
    })
      .select("description")
      .lean();

    const grouped = new Map<string, { sampleDescription: string; count: number }>();
    for (const tx of candidates) {
      const merchantKey = normalizeMerchantKey(tx.description);
      const existing = grouped.get(merchantKey);
      if (existing) {
        existing.count += 1;
      } else {
        grouped.set(merchantKey, { sampleDescription: tx.description, count: 1 });
      }
    }

    if (grouped.size === 0) {
      return [];
    }

    const existingRules = await MerchantCategoryRule.find({
      userId,
      merchantKey: { $in: [...grouped.keys()] },
    })
      .select("merchantKey")
      .lean();
    const ruledKeys = new Set(existingRules.map((r) => r.merchantKey));

    return [...grouped.entries()]
      .filter(([merchantKey]) => !ruledKeys.has(merchantKey))
      .map(([merchantKey, { sampleDescription, count }]) => ({
        merchantKey,
        sampleDescription,
        affectedCount: count,
      }));
  },

  async bulkSetCategoryForMerchant(userId: string, merchantKey: string, categoryId: string) {
    await connectDB();
    const candidates = await Transaction.find({
      userId,
      type: { $in: ["EXPENSE", "INCOME"] },
    })
      .select("description")
      .lean();
    const matchingIds = candidates
      .filter((tx) => normalizeMerchantKey(tx.description) === merchantKey)
      .map((tx) => tx._id);

    if (matchingIds.length === 0) {
      return 0;
    }

    const res = await Transaction.updateMany(
      { _id: { $in: matchingIds }, userId },
      { $set: { categoryId } }
    );
    return res.modifiedCount ?? 0;
  },
};

export default merchantCategoryRuleRepository;

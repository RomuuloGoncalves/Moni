import { connectDB } from "@/lib/db/connect";
import { BudgetGroup } from "@/models/BudgetGroup";

export const budgetGroupRepository = {
  async create(
    userId: string,
    input: { name: string; limitCents: number; categoryIds: string[] }
  ) {
    await connectDB();
    const doc = await BudgetGroup.create({
      userId,
      name: input.name,
      limitCents: input.limitCents,
      categoryIds: input.categoryIds,
    });
    return doc.toObject();
  },

  async list(userId: string) {
    await connectDB();
    return BudgetGroup.find({ userId }).lean();
  },

  async findById(userId: string, groupId: string) {
    await connectDB();
    return BudgetGroup.findOne({ _id: groupId, userId }).lean();
  },

  /** Groups that include any of the given category ids (excluding optional groupId). */
  async findContainingCategories(
    userId: string,
    categoryIds: string[],
    excludeGroupId?: string
  ) {
    await connectDB();
    const filter: Record<string, unknown> = {
      userId,
      categoryIds: { $in: categoryIds },
    };
    if (excludeGroupId) {
      filter._id = { $ne: excludeGroupId };
    }
    return BudgetGroup.find(filter).lean();
  },

  async update(
    userId: string,
    groupId: string,
    input: { name?: string; limitCents?: number; categoryIds?: string[] }
  ) {
    await connectDB();
    const $set: Record<string, unknown> = {};
    if (input.name !== undefined) $set.name = input.name;
    if (input.limitCents !== undefined) $set.limitCents = input.limitCents;
    if (input.categoryIds !== undefined) $set.categoryIds = input.categoryIds;
    return BudgetGroup.findOneAndUpdate({ _id: groupId, userId }, { $set }, { returnDocument: "after" }).lean();
  },

  async delete(userId: string, groupId: string) {
    await connectDB();
    await BudgetGroup.deleteOne({ _id: groupId, userId });
  },

  async removeCategoryFromGroups(userId: string, categoryId: string) {
    await connectDB();
    const groups = await BudgetGroup.find({ userId, categoryIds: categoryId }).lean();
    for (const group of groups) {
      const remaining = group.categoryIds
        .map((id: unknown) => String(id))
        .filter((id: string) => id !== categoryId);
      if (remaining.length < 2) {
        await BudgetGroup.deleteOne({ _id: group._id, userId });
      } else {
        await BudgetGroup.updateOne(
          { _id: group._id, userId },
          { $pull: { categoryIds: categoryId } }
        );
      }
    }
  },
};

export default budgetGroupRepository;

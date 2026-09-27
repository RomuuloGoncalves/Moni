import { connectDB } from "@/lib/db/connect";
import { Budget } from "@/models/Budget";

export const budgetRepository = {
  async upsert(userId: string, categoryId: string, limitCents: number) {
    await connectDB();
    const doc = await Budget.findOneAndUpdate(
      { userId, categoryId },
      { $set: { limitCents }, $setOnInsert: { userId, categoryId } },
      { upsert: true, returnDocument: "after" }
    ).lean();
    return doc;
  },

  async list(userId: string) {
    await connectDB();
    const docs = await Budget.find({ userId }).lean();
    return docs;
  },

  async findByCategory(userId: string, categoryId: string) {
    await connectDB();
    const doc = await Budget.findOne({ userId, categoryId }).lean();
    return doc;
  },
};

export default budgetRepository;

import { connectDB } from "@/lib/db/connect";
import { SavingsGoal } from "@/models/SavingsGoal";

export interface CreateSavingsGoalInput {
  userId: string;
  name: string;
  targetCents: number;
  currentCents?: number;
  deadline?: Date;
  color?: string;
  iconType?: string;
}

export interface UpdateSavingsGoalInput {
  name?: string;
  targetCents?: number;
  currentCents?: number;
  deadline?: Date | null;
  color?: string;
  iconType?: string;
}

export const savingsGoalRepository = {
  async list(userId: string) {
    await connectDB();
    return SavingsGoal.find({ userId }).sort({ createdAt: 1 }).lean();
  },

  async findById(id: string, userId: string) {
    await connectDB();
    return SavingsGoal.findOne({ _id: id, userId }).lean();
  },

  async create(input: CreateSavingsGoalInput) {
    await connectDB();
    const doc = new SavingsGoal(input);
    return doc.save();
  },

  async update(id: string, userId: string, patch: UpdateSavingsGoalInput) {
    await connectDB();
    return SavingsGoal.findOneAndUpdate(
      { _id: id, userId },
      { $set: patch },
      { new: true }
    ).lean();
  },

  async addContribution(id: string, userId: string, amountCents: number) {
    await connectDB();
    return SavingsGoal.findOneAndUpdate(
      { _id: id, userId },
      { $inc: { currentCents: amountCents } },
      { new: true }
    ).lean();
  },

  async delete(id: string, userId: string) {
    await connectDB();
    return SavingsGoal.deleteOne({ _id: id, userId });
  },
};

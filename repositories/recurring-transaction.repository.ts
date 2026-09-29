import { connectDB } from "@/lib/db/connect";
import { RecurringTransaction } from "@/models/RecurringTransaction";
import type { RecurringFrequency, RecurringType } from "@/models/RecurringTransaction";

export interface CreateRecurringInput {
  userId: string;
  accountId: string;
  categoryId?: string;
  type: RecurringType;
  amountCents: number;
  description: string;
  frequency: RecurringFrequency;
  startDate: Date;
  nextDueDate: Date;
}

export interface UpdateRecurringInput {
  accountId?: string;
  categoryId?: string | null;
  type?: RecurringType;
  amountCents?: number;
  description?: string;
  frequency?: RecurringFrequency;
  nextDueDate?: Date;
  isActive?: boolean;
  lastGeneratedYearMonth?: string | null;
}

export const recurringTransactionRepository = {
  async list(userId: string) {
    await connectDB();
    return RecurringTransaction.find({ userId }).sort({ nextDueDate: 1 }).lean();
  },

  async findById(id: string, userId: string) {
    await connectDB();
    return RecurringTransaction.findOne({ _id: id, userId }).lean();
  },

  async findActiveForMonth(userId: string, yearMonth: string) {
    await connectDB();
    return RecurringTransaction.find({
      userId,
      isActive: true,
      $or: [
        { lastGeneratedYearMonth: null },
        { lastGeneratedYearMonth: { $lt: yearMonth } },
      ],
    }).lean();
  },

  async create(input: CreateRecurringInput) {
    await connectDB();
    const doc = new RecurringTransaction(input);
    return doc.save();
  },

  async update(id: string, userId: string, patch: UpdateRecurringInput) {
    await connectDB();
    return RecurringTransaction.findOneAndUpdate(
      { _id: id, userId },
      { $set: patch },
      { new: true }
    ).lean();
  },

  async delete(id: string, userId: string) {
    await connectDB();
    return RecurringTransaction.deleteOne({ _id: id, userId });
  },
};

import { recurringTransactionRepository } from "@/repositories/recurring-transaction.repository";
import { transactionRepository } from "@/repositories/transaction.repository";
import { connectDB } from "@/lib/db/connect";
import { Transaction } from "@/models/Transaction";
import type { RecurringFrequency, RecurringType } from "@/models/RecurringTransaction";
import mongoose from "mongoose";

export interface CreateRecurringInput {
  accountId: string;
  categoryId?: string;
  type: RecurringType;
  amountCents: number;
  description: string;
  frequency: RecurringFrequency;
  startDate: Date;
}

function addFrequencyDays(date: Date, frequency: RecurringFrequency): Date {
  const d = new Date(date);
  switch (frequency) {
    case "WEEKLY":    d.setDate(d.getDate() + 7);   break;
    case "BIWEEKLY":  d.setDate(d.getDate() + 14);  break;
    case "MONTHLY":   d.setMonth(d.getMonth() + 1); break;
    case "YEARLY":    d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

export const recurringTransactionService = {
  async list(userId: string) {
    return recurringTransactionRepository.list(userId);
  },

  async create(userId: string, input: CreateRecurringInput) {
    const nextDueDate = new Date(input.startDate);
    return recurringTransactionRepository.create({
      ...input,
      userId,
      nextDueDate,
    });
  },

  async update(userId: string, id: string, patch: Partial<CreateRecurringInput> & { isActive?: boolean }) {
    return recurringTransactionRepository.update(id, userId, patch);
  },

  async delete(userId: string, id: string) {
    return recurringTransactionRepository.delete(id, userId);
  },

  /**
   * Detects transactions that appear repeatedly (3+ times in the last 6 months)
   * and classifies their likely frequency. Excludes descriptions already tracked
   * as active recurring templates.
   */
  async detectPatterns(userId: string) {
    await connectDB();
    const since = new Date();
    since.setUTCMonth(since.getUTCMonth() - 6);

    // Aggregate: group by normalized description + type, collect dates and amounts
    const agg = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: { $in: ["INCOME", "EXPENSE"] },
          date: { $gte: since },
        },
      },
      {
        $group: {
          _id: { description: "$description", type: "$type" },
          count: { $sum: 1 },
          dates: { $push: "$date" },
          amounts: { $push: "$amount" },
          categoryId: { $last: "$categoryId" },
          accountId: { $last: "$accountId" },
        },
      },
      { $match: { count: { $gte: 3 } } },
      { $sort: { count: -1 } },
    ]);

    // Load existing active recurring descriptions to filter out already-tracked ones
    const existing = await recurringTransactionRepository.list(userId);
    const trackedDescriptions = new Set(
      existing
        .filter((r) => r.isActive)
        .map((r) => r.description.trim().toLowerCase())
    );

    const suggestions: Array<{
      description: string;
      type: RecurringType;
      averageAmountCents: number;
      frequency: RecurringFrequency;
      occurrences: number;
      categoryId: string | null;
      accountId: string;
      lastDate: string;
    }> = [];

    for (const row of agg) {
      const desc: string = row._id.description;
      if (trackedDescriptions.has(desc.trim().toLowerCase())) continue;

      const sortedDates = (row.dates as Date[])
        .map((d) => new Date(d).getTime())
        .sort((a, b) => a - b);

      // Calculate median interval between consecutive occurrences (in days)
      const intervals: number[] = [];
      for (let i = 1; i < sortedDates.length; i++) {
        intervals.push((sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24));
      }
      const medianInterval = intervals.sort((a, b) => a - b)[Math.floor(intervals.length / 2)];

      let frequency: RecurringFrequency;
      if (medianInterval <= 9) frequency = "WEEKLY";
      else if (medianInterval <= 20) frequency = "BIWEEKLY";
      else if (medianInterval <= 40) frequency = "MONTHLY";
      else if (medianInterval <= 100) frequency = "MONTHLY"; // skip if too irregular
      else frequency = "YEARLY";

      // Skip if interval is wildly irregular (std dev > 15 days for non-yearly)
      if (frequency !== "YEARLY") {
        const mean = intervals.reduce((s, v) => s + v, 0) / intervals.length;
        const stdDev = Math.sqrt(intervals.reduce((s, v) => s + (v - mean) ** 2, 0) / intervals.length);
        if (stdDev > 15 && frequency !== "MONTHLY") continue;
        if (stdDev > 25) continue;
      }

      const amounts: number[] = row.amounts as number[];
      const avgAmount = Math.round(amounts.reduce((s, v) => s + v, 0) / amounts.length);
      const lastDate = new Date(Math.max(...sortedDates)).toISOString();

      suggestions.push({
        description: desc,
        type: row._id.type as RecurringType,
        averageAmountCents: avgAmount,
        frequency,
        occurrences: row.count as number,
        categoryId: row.categoryId ? String(row.categoryId) : null,
        accountId: String(row.accountId),
        lastDate,
      });
    }

    return suggestions.slice(0, 15); // limit to 15 suggestions
  },

  async generateForMonth(userId: string, year: number, month: number) {
    const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
    const templates = await recurringTransactionRepository.findActiveForMonth(userId, yearMonth);
    if (templates.length === 0) return 0;

    let generated = 0;
    for (const t of templates) {
      const nextDue = new Date(t.nextDueDate);
      // Generate if nextDue falls within this month or is overdue
      const targetYear = nextDue.getUTCFullYear();
      const targetMonth = nextDue.getUTCMonth() + 1;
      if (targetYear > year || (targetYear === year && targetMonth > month)) continue;

      await transactionRepository.create({
        userId: String(t.userId),
        accountId: String(t.accountId),
        categoryId: t.categoryId ? String(t.categoryId) : undefined,
        type: t.type as RecurringType,
        amount: t.amountCents,
        date: nextDue,
        description: t.description,
        isPaid: false,
      });

      const newNextDue = addFrequencyDays(nextDue, t.frequency as RecurringFrequency);
      await recurringTransactionRepository.update(String(t._id), userId, {
        nextDueDate: newNextDue,
        lastGeneratedYearMonth: yearMonth,
      });
      generated++;
    }
    return generated;
  },
};

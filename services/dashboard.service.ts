import { connectDB } from "@/lib/db/connect";
import { Transaction } from "@/models/Transaction";
import { accountRepository } from "@/repositories/account.repository";
import { transactionRepository } from "@/repositories/transaction.repository";

export interface CategoryMonthlySummary {
  categoryId: string | null;
  income: number;
  expense: number;
}

export interface MonthlyComparison {
  label: string;   // "Jan", "Fev", etc.
  month: number;
  year: number;
  income: number;
  expense: number;
}

export interface PendingTransaction {
  _id: string;
  description: string;
  amount: number;
  date: string;
  type: string;
}

const MONTH_LABELS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

/** Returns the [from, to] UTC date range covering the whole given month (1-12). */
function monthRange(month: number, year: number) {
  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { from, to };
}

export const dashboardService = {
  /** DASH-01 AC1: sum of the balance of every account belonging to the user. */
  async getConsolidatedBalance(userId: string): Promise<{ total: number; available: number }> {
    const accounts = await accountRepository.list(userId);
    const total = accounts.reduce((sum, account) => sum + (account.balance ?? 0), 0);
    const available = accounts
      .filter((a) => a.type === "CASH" || a.type === "CHECKING")
      .reduce((sum, account) => sum + (account.balance ?? 0), 0);
    return { total, available };
  },

  /**
   * DASH-01 AC2/AC3: total paid INCOME/EXPENSE for the given month, grouped by
   * category. Unpaid transactions and TRANSFERs are excluded. AC4: an empty
   * month simply yields an empty array, never an error.
   */
  async getMonthlySummaryByCategory(
    userId: string,
    month: number,
    year: number
  ): Promise<CategoryMonthlySummary[]> {
    const { from, to } = monthRange(month, year);
    const transactions = await transactionRepository.list(userId, { from, to });

    const byCategory = new Map<string, CategoryMonthlySummary>();
    for (const transaction of transactions) {
      if (!transaction.isPaid) continue;
      if (transaction.type !== "INCOME" && transaction.type !== "EXPENSE") continue;

      const categoryId = transaction.categoryId ? String(transaction.categoryId) : null;
      const key = categoryId ?? "uncategorized";
      const entry = byCategory.get(key) ?? { categoryId, income: 0, expense: 0 };
      if (transaction.type === "INCOME") {
        entry.income += transaction.amount;
      } else {
        entry.expense += transaction.amount;
      }
      byCategory.set(key, entry);
    }

    return Array.from(byCategory.values());
  },

  /**
   * Returns overdue + upcoming unpaid EXPENSE/INCOME transactions (next 7 days).
   */
  async getPendingTransactions(userId: string): Promise<PendingTransaction[]> {
    await connectDB();
    const now = new Date();
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const docs = await Transaction.find({
      userId,
      isPaid: false,
      type: { $in: ["EXPENSE", "INCOME"] },
      date: { $lte: in7days },
    })
      .sort({ date: 1 })
      .limit(20)
      .lean();
    return docs.map((d) => ({
      _id: String(d._id),
      description: d.description,
      amount: d.amount,
      date: d.date.toISOString(),
      type: d.type,
    }));
  },

  /**
   * Returns income vs expense totals for the last `months` months.
   */
  async getMonthlyComparison(userId: string, months = 6): Promise<MonthlyComparison[]> {
    await connectDB();
    const now = new Date();
    const result: MonthlyComparison[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const month = d.getUTCMonth() + 1;
      const year = d.getUTCFullYear();
      const { from, to } = monthRange(month, year);

      const agg = await Transaction.aggregate([
        {
          $match: {
            userId: new (await import("mongoose")).default.Types.ObjectId(userId),
            isPaid: true,
            type: { $in: ["INCOME", "EXPENSE"] },
            date: { $gte: from, $lte: to },
          },
        },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amount" },
          },
        },
      ]);

      const income = agg.find((r) => r._id === "INCOME")?.total ?? 0;
      const expense = agg.find((r) => r._id === "EXPENSE")?.total ?? 0;
      result.push({ label: MONTH_LABELS[month - 1], month, year, income, expense });
    }

    return result;
  },

  /**
   * Returns projected daily balance for the next `days` days based on
   * active recurring transactions.
   */
  async getBalanceProjection(
    userId: string,
    currentBalance: number,
    recurringTransactions: Array<{
      type: string;
      amountCents: number;
      nextDueDate: Date;
      frequency: string;
    }>,
    days = 90
  ): Promise<Array<{ date: string; balance: number }>> {
    const points: Array<{ date: string; balance: number }> = [];
    const now = new Date();
    let balance = currentBalance;

    // Build a map of date → net amount from recurring
    const dailyMap = new Map<string, number>();
    for (const rt of recurringTransactions) {
      let cursor = new Date(rt.nextDueDate);
      while (cursor <= new Date(now.getTime() + days * 24 * 60 * 60 * 1000)) {
        const key = cursor.toISOString().slice(0, 10);
        const delta = rt.type === "INCOME" ? rt.amountCents : -rt.amountCents;
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + delta);
        // Advance cursor by frequency
        const next = new Date(cursor);
        if (rt.frequency === "WEEKLY") next.setUTCDate(next.getUTCDate() + 7);
        else if (rt.frequency === "BIWEEKLY") next.setUTCDate(next.getUTCDate() + 14);
        else if (rt.frequency === "YEARLY") next.setUTCFullYear(next.getUTCFullYear() + 1);
        else next.setUTCMonth(next.getUTCMonth() + 1); // MONTHLY
        cursor = next;
      }
    }

    for (let i = 0; i <= days; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      balance += dailyMap.get(key) ?? 0;
      if (i % 3 === 0 || i === days) { // sample every 3 days to reduce data points
        points.push({ date: key, balance });
      }
    }

    return points;
  },
};

export default dashboardService;

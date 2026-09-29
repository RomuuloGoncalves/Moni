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
   * Returns daily expense totals for the current month — used for the heatmap.
   */
  async getDailyExpenses(
    userId: string,
    month: number,
    year: number,
  ): Promise<Record<string, { total: number; items: { description: string; amountCents: number }[] }>> {
    await connectDB();
    const { from, to } = monthRange(month, year);
    const mongoose = (await import("mongoose")).default;
    const rows = await Transaction.find({
      userId: new mongoose.Types.ObjectId(userId),
      type: "EXPENSE",
      isPaid: true,
      date: { $gte: from, $lte: to },
    })
      .select("date amount description")
      .lean();

    const map: Record<string, { total: number; items: { description: string; amountCents: number }[] }> = {};
    for (const r of rows) {
      const key = new Date(r.date as Date).toISOString().slice(0, 10);
      if (!map[key]) map[key] = { total: 0, items: [] };
      map[key].total += r.amount as number;
      map[key].items.push({ description: r.description as string, amountCents: r.amount as number });
    }
    // Sort items descending by amount
    for (const v of Object.values(map)) v.items.sort((a, b) => b.amountCents - a.amountCents);
    return map;
  },

  /**
   * Calculates "how much can I spend today": available balance divided by
   * remaining days in the month, minus pending recurring expenses.
   */
  async getSpendableToday(
    userId: string,
    availableBalance: number,
    pendingRecurringCents: number
  ): Promise<number> {
    const now = new Date();
    const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    const remainingDays = lastDay.getUTCDate() - now.getUTCDate() + 1;
    if (remainingDays <= 0) return 0;
    const spendable = (availableBalance - pendingRecurringCents) / remainingDays;
    return Math.max(0, Math.round(spendable));
  },

  /**
   * Calculates a 0–100 financial health score.
   * Components: savings rate (40pts), budgets on track (30pts), goals in progress (20pts), no overdue (10pts).
   */
  async getHealthScore(userId: string, month: number, year: number): Promise<{
    score: number;
    savingsRate: number;
    budgetsOk: number;
    goalsActive: number;
    hasOverdue: boolean;
  }> {
    await connectDB();
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
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]);

    const income = agg.find((r) => r._id === "INCOME")?.total ?? 0;
    const expense = agg.find((r) => r._id === "EXPENSE")?.total ?? 0;
    const savingsRate = income > 0 ? Math.max(0, (income - expense) / income) : 0;
    const savingsScore = Math.min(40, Math.round(savingsRate * 100)); // 40% weight

    // Check overdue
    const now = new Date();
    const overdueCount = await Transaction.countDocuments({
      userId: new (await import("mongoose")).default.Types.ObjectId(userId),
      isPaid: false,
      type: { $in: ["INCOME", "EXPENSE"] },
      date: { $lt: now },
    });
    const overdueScore = overdueCount === 0 ? 10 : 0;

    // Goals: any active = partial credit
    const { SavingsGoal } = await import("@/models/SavingsGoal");
    const goals = await SavingsGoal.find({ userId }).lean();
    const activeGoals = goals.filter((g) => g.currentCents < g.targetCents).length;
    const completedGoals = goals.filter((g) => g.currentCents >= g.targetCents).length;
    const goalsScore = goals.length === 0 ? 10 : Math.min(20, completedGoals * 10 + (activeGoals > 0 ? 5 : 0));

    // Budgets: placeholder 20pts (full budget integration would require budget progress)
    const budgetsScore = 20;

    const score = Math.min(100, savingsScore + goalsScore + budgetsScore + overdueScore);

    return {
      score,
      savingsRate: Math.round(savingsRate * 100),
      budgetsOk: budgetsScore,
      goalsActive: activeGoals,
      hasOverdue: overdueCount > 0,
    };
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

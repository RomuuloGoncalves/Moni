import { accountRepository } from "@/repositories/account.repository";
import { transactionRepository } from "@/repositories/transaction.repository";

export interface CategoryMonthlySummary {
  categoryId: string | null;
  income: number;
  expense: number;
}

/** Returns the [from, to] UTC date range covering the whole given month (1-12). */
function monthRange(month: number, year: number) {
  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { from, to };
}

export const dashboardService = {
  /** DASH-01 AC1: sum of the balance of every account belonging to the user. */
  async getConsolidatedBalance(userId: string): Promise<number> {
    const accounts = await accountRepository.list(userId);
    return accounts.reduce((sum, account) => sum + (account.balance ?? 0), 0);
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
};

export default dashboardService;

import { getDashboardDataAction } from "./actions";
import { ConsolidatedBalanceCard } from "@/components/dashboard/consolidated-balance-card";
import { CategorySummary } from "@/components/dashboard/category-summary";
import { BudgetProgress } from "@/components/dashboard/BudgetProgress";
import { MonthSelector } from "@/components/dashboard/month-selector";
import { PendingTransactionsCard } from "@/components/dashboard/pending-transactions-card";
import { MonthlyComparisonChart } from "@/components/dashboard/monthly-comparison-chart";
import { BalanceProjectionChart } from "@/components/dashboard/balance-projection-chart";
import { ExpenseHeatmap } from "@/components/dashboard/expense-heatmap";
import { SpendableTodayCard } from "@/components/dashboard/spendable-today-card";
import { HealthScoreCard } from "@/components/dashboard/health-score-card";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const month = params.month ? parseInt(params.month, 10) : undefined;
  const year = params.year ? parseInt(params.year, 10) : undefined;

  const result = await getDashboardDataAction({ month, year });
  const data = result.data ?? {
    consolidatedBalance: 0,
    availableBalance: 0,
    month: month ?? new Date().getUTCMonth() + 1,
    year: year ?? new Date().getUTCFullYear(),
    summaryByCategory: [],
    categories: [],
    budgetProgress: [],
    pendingTransactions: [],
    monthlyComparison: [],
    balanceProjection: [],
    dailyExpenses: {},
    spendableToday: 0,
    healthScore: { score: 0, savingsRate: 0, goalsActive: 0, hasOverdue: false },
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resumo</h1>
          <p className="text-sm text-muted-foreground">
            Sua situação financeira consolidada e o resumo do mês.
          </p>
        </div>
        <MonthSelector currentMonth={data.month} currentYear={data.year} />
      </div>
      <PendingTransactionsCard items={data.pendingTransactions as never} />
      <SpendableTodayCard spendableCents={data.spendableToday} month={data.month} year={data.year} />
      <ConsolidatedBalanceCard balanceCents={data.consolidatedBalance} availableBalanceCents={data.availableBalance} />
      <ExpenseHeatmap dailyExpenses={data.dailyExpenses as never} month={data.month} year={data.year} />
      {/* <HealthScoreCard
        score={(data.healthScore as never as { score: number }).score}
        savingsRate={(data.healthScore as never as { savingsRate: number }).savingsRate}
        goalsActive={(data.healthScore as never as { goalsActive: number }).goalsActive}
        hasOverdue={(data.healthScore as never as { hasOverdue: boolean }).hasOverdue}
      /> */}
      {/* <MonthlyComparisonChart data={data.monthlyComparison as never} /> */}
      <BalanceProjectionChart data={data.balanceProjection as never} />
      <CategorySummary
        summary={data.summaryByCategory as never}
        categories={data.categories as never}
        type="income"
      />
      <CategorySummary
        summary={data.summaryByCategory as never}
        categories={data.categories as never}
        type="expense"
      />
      <BudgetProgress
        progress={data.budgetProgress as never}
        categories={data.categories as never}
      />
    </main>
  );
}

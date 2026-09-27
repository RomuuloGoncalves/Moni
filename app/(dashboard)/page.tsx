import { getDashboardDataAction } from "./actions";
import { ConsolidatedBalanceCard } from "@/components/dashboard/consolidated-balance-card";
import { CategorySummary } from "@/components/dashboard/category-summary";
import { BudgetProgress } from "@/components/dashboard/BudgetProgress";
import { MonthSelector } from "@/components/dashboard/month-selector";

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
    month: month ?? new Date().getUTCMonth() + 1,
    year: year ?? new Date().getUTCFullYear(),
    summaryByCategory: [],
    categories: [],
    budgetProgress: [],
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
      <ConsolidatedBalanceCard balanceCents={data.consolidatedBalance} />
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

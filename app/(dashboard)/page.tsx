import { getDashboardDataAction } from "./actions";
import { ConsolidatedBalanceCard } from "@/components/dashboard/consolidated-balance-card";
import { CategorySummary } from "@/components/dashboard/category-summary";
import { BudgetProgress } from "@/components/dashboard/BudgetProgress";

export default async function DashboardPage() {
  const result = await getDashboardDataAction();
  const data = result.data ?? {
    consolidatedBalance: 0,
    summaryByCategory: [],
    categories: [],
    budgetProgress: [],
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Resumo</h1>
        <p className="text-sm text-muted-foreground">
          Sua situação financeira consolidada e o resumo do mês atual.
        </p>
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

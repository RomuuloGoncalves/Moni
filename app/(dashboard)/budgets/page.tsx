import { listCategoriesAction } from "../categories/actions";
import { getBudgetProgressAction } from "./actions";
import { BudgetForm } from "@/components/dashboard/budget-form";

export default async function BudgetsPage() {
  const [categoriesResult, progressResult] = await Promise.all([
    listCategoriesAction(),
    getBudgetProgressAction(),
  ]);

  const categories = (categoriesResult.data ?? []) as { _id: string; name: string }[];
  const progress = (progressResult.data ?? []) as {
    categoryId: string;
    limitCents: number;
  }[];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orçamentos</h1>
        <p className="text-sm text-muted-foreground">
          Defina um limite mensal de gasto por categoria e acompanhe no Resumo.
        </p>
      </div>
      <BudgetForm
        categories={categories.map((c) => ({ ...c, _id: String(c._id) }))}
        budgets={progress.map((p) => ({ ...p, categoryId: String(p.categoryId) }))}
      />
    </main>
  );
}

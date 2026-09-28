import { listCategoriesAction } from "../categories/actions";
import { getBudgetProgressAction, listBudgetGroupsAction } from "./actions";
import { BudgetForm } from "@/components/dashboard/budget-form";
import { BudgetGroupForm } from "@/components/dashboard/budget-group-form";

export default async function BudgetsPage() {
  const [categoriesResult, progressResult, groupsResult] = await Promise.all([
    listCategoriesAction(),
    getBudgetProgressAction(),
    listBudgetGroupsAction(),
  ]);

  const categories = (categoriesResult.data ?? []) as { _id: string; name: string }[];
  const progress = (progressResult.data ?? []) as {
    kind?: string;
    categoryId: string;
    limitCents: number;
  }[];
  const groups = (groupsResult.data ?? []) as {
    _id: string;
    name: string;
    limitCents: number;
    categoryIds: string[];
  }[];

  const groupedCategoryIds = new Set(
    groups.flatMap((g) => g.categoryIds.map((id) => String(id)))
  );
  const soloCategories = categories
    .map((c) => ({ ...c, _id: String(c._id) }))
    .filter((c) => !groupedCategoryIds.has(c._id));

  const soloBudgets = progress
    .filter((p) => p.kind === "solo" || (!p.kind && p.categoryId))
    .map((p) => ({ categoryId: String(p.categoryId), limitCents: p.limitCents }));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orçamentos</h1>
        <p className="text-sm text-muted-foreground">
          Defina limites mensais por categoria ou vincule categorias relacionadas a um limite
          compartilhado.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Grupos compartilhados</h2>
        <BudgetGroupForm
          categories={categories.map((c) => ({ _id: String(c._id), name: c.name }))}
          groups={groups.map((g) => ({
            _id: String(g._id),
            name: g.name,
            limitCents: g.limitCents,
            categoryIds: g.categoryIds.map(String),
          }))}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Por categoria</h2>
        <p className="text-sm text-muted-foreground">
          Categorias que já estão em um grupo compartilhado não aparecem aqui — o limite delas é
          definido no grupo.
        </p>
        <BudgetForm categories={soloCategories} budgets={soloBudgets} />
      </section>
    </main>
  );
}

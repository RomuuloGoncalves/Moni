import { listRecurringAction, detectRecurringPatternsAction } from "./actions";
import { listAccountsAction } from "@/app/(dashboard)/accounts/actions";
import { listCategoriesAction } from "@/app/(dashboard)/categories/actions";
import { RecurringList } from "@/components/recurring/recurring-list";

export default async function RecurringPage() {
  const [recurringResult, accountsResult, categoriesResult, suggestionsResult] = await Promise.all([
    listRecurringAction(),
    listAccountsAction(),
    listCategoriesAction(),
    detectRecurringPatternsAction(),
  ]);

  const items = (recurringResult.data ?? []) as never[];
  const accounts = (accountsResult.data ?? []) as { _id: string; name: string }[];
  const categories = (categoriesResult.data ?? []) as { _id: string; name: string; color: string }[];
  const suggestions = (suggestionsResult.data ?? []) as never[];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transações Recorrentes</h1>
        <p className="text-sm text-muted-foreground">
          Templates que geram lançamentos automaticamente a cada ciclo.
        </p>
      </div>
      <RecurringList
        initialItems={items}
        accounts={accounts.map((a) => ({ ...a, _id: String(a._id) }))}
        categories={categories.map((c) => ({ ...c, _id: String(c._id), iconType: "" }))}
        suggestions={suggestions}
      />
    </main>
  );
}

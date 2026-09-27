import { listUncategorizedMerchantsAction, listMerchantRulesAction } from "./actions";
import { listCategoriesAction } from "../categories/actions";
import { MerchantsView } from "@/components/merchants/merchants-view";

export default async function MerchantsPage() {
  const [uncategorizedResult, rulesResult, categoriesResult] = await Promise.all([
    listUncategorizedMerchantsAction(),
    listMerchantRulesAction(),
    listCategoriesAction(),
  ]);

  const uncategorized = (uncategorizedResult.data ?? []) as {
    merchantKey: string;
    sampleDescription: string;
    affectedCount: number;
  }[];
  const rules = (rulesResult.data ?? []) as {
    merchantKey: string;
    categoryId: string;
    categoryName: string;
  }[];
  const categories = (categoriesResult.data ?? []) as {
    _id: string;
    name: string;
  }[];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Comerciantes</h1>
        <p className="text-sm text-muted-foreground">
          Categorize em lote comerciantes recorrentes e edite regras já criadas.
        </p>
      </div>
      <MerchantsView
        initialUncategorized={uncategorized}
        initialRules={rules}
        categories={categories.map((c) => ({ ...c, _id: String(c._id) }))}
      />
    </main>
  );
}

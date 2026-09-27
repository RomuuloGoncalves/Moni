"use client";

import { useState, useTransition } from "react";
import { categorizeMerchantAction } from "@/app/(dashboard)/merchants/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface UncategorizedMerchant {
  merchantKey: string;
  sampleDescription: string;
  affectedCount: number;
}

interface MerchantRule {
  merchantKey: string;
  categoryId: string;
  categoryName: string;
}

interface CategoryOption {
  _id: string;
  name: string;
}

function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: CategoryOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-lg border border-input bg-card px-3 text-sm shadow-xs outline-none transition-colors hover:border-ring/60 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20"
    >
      <option value="" disabled>
        Escolha uma categoria
      </option>
      {categories.map((c) => (
        <option key={c._id} value={c._id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

export function MerchantsView({
  initialUncategorized,
  initialRules,
  categories,
}: {
  initialUncategorized: UncategorizedMerchant[];
  initialRules: MerchantRule[];
  categories: CategoryOption[];
}) {
  const [uncategorized, setUncategorized] = useState(initialUncategorized);
  const [rules, setRules] = useState(initialRules);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function handleCategorize(merchantKey: string, isRuleEdit: boolean) {
    const categoryId = selection[merchantKey];
    if (!categoryId) {
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const result = await categorizeMerchantAction(merchantKey, categoryId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (isRuleEdit) {
        const categoryName = categories.find((c) => c._id === categoryId)?.name ?? "";
        setRules((prev) =>
          prev.map((r) => (r.merchantKey === merchantKey ? { ...r, categoryId, categoryName } : r))
        );
      } else {
        setUncategorized((prev) => prev.filter((m) => m.merchantKey !== merchantKey));
        const categoryName = categories.find((c) => c._id === categoryId)?.name ?? "";
        setRules((prev) => [{ merchantKey, categoryId, categoryName }, ...prev]);
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Sem regra ainda</h2>
        {uncategorized.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum comerciante sem categoria no momento.
          </p>
        ) : (
          uncategorized.map((merchant) => (
            <Card key={merchant.merchantKey}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{merchant.sampleDescription}</p>
                  <p className="text-sm text-muted-foreground">
                    {merchant.affectedCount} transação(ões) afetada(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="sr-only">Categoria</Label>
                  <CategorySelect
                    categories={categories}
                    value={selection[merchant.merchantKey] ?? ""}
                    onChange={(v) =>
                      setSelection((prev) => ({ ...prev, [merchant.merchantKey]: v }))
                    }
                  />
                  <Button
                    size="sm"
                    disabled={isPending || !selection[merchant.merchantKey]}
                    onClick={() => handleCategorize(merchant.merchantKey, false)}
                  >
                    Categorizar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Regras existentes</h2>
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma regra criada ainda.</p>
        ) : (
          rules.map((rule) => (
            <Card key={rule.merchantKey}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{rule.merchantKey}</p>
                  <p className="text-sm text-muted-foreground">Categoria atual: {rule.categoryName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <CategorySelect
                    categories={categories}
                    value={selection[rule.merchantKey] ?? rule.categoryId}
                    onChange={(v) => setSelection((prev) => ({ ...prev, [rule.merchantKey]: v }))}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => handleCategorize(rule.merchantKey, true)}
                  >
                    Trocar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}

export default MerchantsView;

"use client";

import { useState, useTransition } from "react";
import { categorizeMerchantAction, bulkCategorizeMerchantsAction } from "@/app/(dashboard)/merchants/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Layers, Search } from "lucide-react";

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

interface BulkModalProps {
  uncategorized: UncategorizedMerchant[];
  categories: CategoryOption[];
  onDone: (categoryId: string, categoryName: string, keys: string[]) => void;
  onClose: () => void;
}

function BulkCategorizeModal({ uncategorized, categories, onDone, onClose }: BulkModalProps) {
  const [categoryId, setCategoryId] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = uncategorized.filter((m) =>
    m.sampleDescription.toLowerCase().includes(search.toLowerCase())
  );

  function toggleAll() {
    if (checked.size === filtered.length) {
      setChecked(new Set());
    } else {
      setChecked(new Set(filtered.map((m) => m.merchantKey)));
    }
  }

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId) { setError("Selecione uma categoria"); return; }
    if (checked.size === 0) { setError("Selecione ao menos um comerciante"); return; }
    setError("");
    const keys = [...checked];
    startTransition(async () => {
      const res = await bulkCategorizeMerchantsAction(keys, categoryId);
      if (res.error) { setError(res.error); return; }
      const catName = categories.find((c) => c._id === categoryId)?.name ?? "";
      onDone(categoryId, catName, keys);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-16">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-lg flex-col gap-4 rounded-xl border bg-card p-5 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Categorizar em lote</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent text-lg leading-none">✕</button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Categoria de destino</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>Escolha uma categoria…</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar comerciantes…"
            className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-muted-foreground">
              {filtered.length} comerciante{filtered.length !== 1 ? "s" : ""} sem categoria
            </label>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-primary hover:underline"
            >
              {checked.size === filtered.length ? "Desmarcar todos" : "Selecionar todos"}
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto flex flex-col gap-1 rounded-lg border bg-muted/30 p-2">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">Nenhum resultado</p>
            ) : (
              filtered.map((m) => (
                <label key={m.merchantKey} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                  <input
                    type="checkbox"
                    checked={checked.has(m.merchantKey)}
                    onChange={() => toggle(m.merchantKey)}
                    className="size-4 rounded"
                  />
                  <span className="flex-1 truncate">{m.sampleDescription}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{m.affectedCount}×</span>
                </label>
              ))
            )}
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
            Cancelar
          </button>
          <Button type="submit" disabled={isPending || checked.size === 0}>
            {isPending ? "Salvando…" : `Categorizar ${checked.size > 0 ? `(${checked.size})` : ""}`}
          </Button>
        </div>
      </form>
    </div>
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
  const [showBulk, setShowBulk] = useState(false);

  function handleBulkDone(categoryId: string, categoryName: string, keys: string[]) {
    const keySet = new Set(keys);
    setUncategorized((prev) => prev.filter((m) => !keySet.has(m.merchantKey)));
    setRules((prev) => [
      ...keys.map((key) => ({ merchantKey: key, categoryId, categoryName })),
      ...prev.filter((r) => !keySet.has(r.merchantKey)),
    ]);
    setShowBulk(false);
  }

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
      {showBulk && uncategorized.length > 0 && (
        <BulkCategorizeModal
          uncategorized={uncategorized}
          categories={categories}
          onDone={handleBulkDone}
          onClose={() => setShowBulk(false)}
        />
      )}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sem regra ainda</h2>
          {uncategorized.length > 1 && (
            <button
              type="button"
              onClick={() => setShowBulk(true)}
              className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
            >
              <Layers className="size-3.5" />
              Categorizar em lote
            </button>
          )}
        </div>
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

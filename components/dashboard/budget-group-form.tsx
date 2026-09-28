"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createBudgetGroupAction,
  updateBudgetGroupAction,
  deleteBudgetGroupAction,
} from "@/app/(dashboard)/budgets/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CategoryItem {
  _id: string;
  name: string;
}

interface BudgetGroupItem {
  _id: string;
  name: string;
  limitCents: number;
  categoryIds: string[];
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parseLimitToCents(raw: string): number {
  return Math.round(parseFloat(raw.replace(",", ".")) * 100);
}

export function BudgetGroupForm({
  categories,
  groups: initialGroups,
}: {
  categories: CategoryItem[];
  groups: BudgetGroupItem[];
}) {
  const [groups, setGroups] = useState(initialGroups);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const categoriesInOtherGroups = useMemo(() => {
    const set = new Set<string>();
    for (const group of groups) {
      if (group._id === editingId) continue;
      for (const id of group.categoryIds) {
        set.add(String(id));
      }
    }
    return set;
  }, [groups, editingId]);

  const selectableCategories = categories.filter(
    (c) => !categoriesInOtherGroups.has(c._id) || selectedIds.includes(c._id)
  );

  function resetForm() {
    setEditingId(null);
    setName("");
    setLimit("");
    setSelectedIds([]);
    setError("");
    setSaved(false);
  }

  function startEdit(group: BudgetGroupItem) {
    setEditingId(group._id);
    setName(group.name);
    setLimit(centsToInput(group.limitCents));
    setSelectedIds(group.categoryIds.map(String));
    setError("");
    setSaved(false);
  }

  function toggleCategory(categoryId: string) {
    setSelectedIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    const limitCents = parseLimitToCents(limit);
    if (selectedIds.length < 2) {
      setError("Selecione pelo menos duas categorias para compartilhar o orçamento.");
      return;
    }

    startTransition(async () => {
      if (editingId) {
        const result = await updateBudgetGroupAction(editingId, {
          name,
          limitCents,
          categoryIds: selectedIds,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        const updated = result.data as BudgetGroupItem;
        setGroups((prev) =>
          prev.map((g) =>
            g._id === editingId
              ? {
                  ...g,
                  name: updated.name,
                  limitCents: updated.limitCents,
                  categoryIds: updated.categoryIds.map(String),
                }
              : g
          )
        );
      } else {
        const result = await createBudgetGroupAction({
          name,
          limitCents,
          categoryIds: selectedIds,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        const created = result.data as BudgetGroupItem;
        setGroups((prev) => [
          ...prev,
          {
            _id: String(created._id),
            name: created.name,
            limitCents: created.limitCents,
            categoryIds: created.categoryIds.map(String),
          },
        ]);
      }
      setSaved(true);
      if (!editingId) {
        resetForm();
      }
    });
  }

  function handleDelete(groupId: string) {
    startTransition(async () => {
      const result = await deleteBudgetGroupAction(groupId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setGroups((prev) => prev.filter((g) => g._id !== groupId));
      if (editingId === groupId) {
        resetForm();
      }
    });
  }

  const categoryNameById = new Map(categories.map((c) => [c._id, c.name]));

  return (
    <div className="flex flex-col gap-4">
      {groups.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {groups.map((group) => (
            <li key={group._id}>
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle className="text-base">{group.name}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Limite: R$ {centsToInput(group.limitCents)} ·{" "}
                      {group.categoryIds
                        .map((id) => categoryNameById.get(String(id)) ?? "Categoria")
                        .join(", ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => startEdit(group)}>
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleDelete(group._id)}
                    >
                      Excluir
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {editingId ? "Editar grupo compartilhado" : "Novo grupo compartilhado"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Várias categorias dividem um único limite mensual. Limites individuais das categorias
            selecionadas serão removidos — defina um valor único para o grupo.
          </p>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="group-name">Nome do grupo</Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Alimentação"
                maxLength={60}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="group-limit">Limite mensal compartilhado (R$)</Label>
              <Input
                id="group-limit"
                type="number"
                min="0.01"
                step="0.01"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                required
              />
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Categorias vinculadas</legend>
              {selectableCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Crie mais categorias ou libere categorias de outros grupos.
                </p>
              ) : (
                selectableCategories.map((category) => (
                  <label
                    key={category._id}
                    className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md border px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      className="size-4 shrink-0"
                      checked={selectedIds.includes(category._id)}
                      onChange={() => toggleCategory(category._id)}
                    />
                    <span className="text-sm">{category.name}</span>
                  </label>
                ))
              )}
            </fieldset>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isPending}>
                {editingId ? "Salvar grupo" : "Criar grupo"}
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar edição
                </Button>
              ) : null}
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {saved ? <p className="text-sm text-muted-foreground">Grupo salvo.</p> : null}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

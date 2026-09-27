"use client";

import { useState, useTransition } from "react";
import { setBudgetAction } from "@/app/(dashboard)/budgets/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CategoryItem {
  _id: string;
  name: string;
}

interface BudgetItem {
  categoryId: string;
  limitCents: number;
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function BudgetForm({
  categories,
  budgets,
}: {
  categories: CategoryItem[];
  budgets: BudgetItem[];
}) {
  const limitByCategory = new Map(budgets.map((b) => [b.categoryId, b.limitCents]));
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      categories.map((c) => [c._id, centsToInput(limitByCategory.get(c._id) ?? 0)])
    )
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(categoryId: string) {
    const raw = values[categoryId] ?? "0";
    const limitCents = Math.round(parseFloat(raw.replace(",", ".")) * 100);

    startTransition(async () => {
      const result = await setBudgetAction(categoryId, limitCents);
      if (result.error) {
        setErrors((prev) => ({ ...prev, [categoryId]: result.error! }));
        setSaved((prev) => ({ ...prev, [categoryId]: false }));
      } else {
        setErrors((prev) => ({ ...prev, [categoryId]: "" }));
        setSaved((prev) => ({ ...prev, [categoryId]: true }));
      }
    });
  }

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Crie ao menos uma categoria antes de definir um orçamento.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {categories.map((category) => (
        <Card key={category._id}>
          <CardHeader>
            <CardTitle className="text-base">{category.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(category._id);
              }}
            >
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor={`limit-${category._id}`}>Limite mensal (R$)</Label>
                <Input
                  id={`limit-${category._id}`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={values[category._id] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [category._id]: e.target.value }))
                  }
                />
              </div>
              <Button type="submit" disabled={isPending}>
                Salvar
              </Button>
            </form>
            {errors[category._id] ? (
              <p className="mt-2 text-sm text-destructive">{errors[category._id]}</p>
            ) : saved[category._id] ? (
              <p className="mt-2 text-sm text-muted-foreground">Limite salvo.</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

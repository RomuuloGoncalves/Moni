import Link from "next/link";
import { Badge } from "@/components/ui/badge";

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface BudgetProgressItem {
  categoryId: string;
  limitCents: number;
  spentCents: number;
  percentage: number;
  overLimit: boolean;
}

export interface CategoryMeta {
  _id: string;
  name: string;
  color: string;
}

export function BudgetProgress({
  progress,
  categories,
}: {
  progress: BudgetProgressItem[];
  categories: CategoryMeta[];
}) {
  const categoryById = new Map(categories.map((c) => [c._id, c]));

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Orçamentos do mês</h2>
        <Link href="/budgets" className="text-xs font-medium text-primary hover:underline">
          Definir limites
        </Link>
      </div>

      {progress.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nenhum limite de orçamento definido ainda.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {progress.map((item) => {
            const meta = categoryById.get(item.categoryId);
            const barWidth = Math.min(item.percentage, 100);
            return (
              <li key={item.categoryId}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{meta?.name ?? "Categoria"}</span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums text-muted-foreground">
                      {formatCurrency(item.spentCents)} de {formatCurrency(item.limitCents)}
                    </span>
                    {item.overLimit ? (
                      <Badge variant="destructive">Estourado</Badge>
                    ) : (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {item.percentage}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${item.overLimit ? "bg-destructive" : "bg-primary"}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

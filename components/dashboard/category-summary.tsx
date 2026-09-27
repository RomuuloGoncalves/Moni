"use client";

import { Pie, PieChart, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Utensils,
  Car,
  Home,
  Heart,
  Gamepad2,
  Book,
  ShoppingBag,
  Tag,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  home: Home,
  heart: Heart,
  gamepad: Gamepad2,
  book: Book,
  "shopping-bag": ShoppingBag,
  tag: Tag,
};

const PALETTE = [
  "var(--primary)",
  "#4C956C",
  "#8DA9C4",
  "#E8998D",
  "#D4A373",
  "#7B8B99",
];

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface CategorySummaryItem {
  categoryId: string | null;
  income: number;
  expense: number;
}

export interface CategoryMeta {
  _id: string;
  name: string;
  color: string;
  iconType: string;
}

export function CategorySummary({
  summary,
  categories,
  type = "expense",
}: {
  summary: CategorySummaryItem[];
  categories: CategoryMeta[];
  type?: "income" | "expense";
}) {
  const categoryById = new Map(categories.map((c) => [c._id, c]));

  const rows = summary
    .filter((item) => type === "expense" ? item.expense > 0 : item.income > 0)
    .map((item, index) => {
      const meta = item.categoryId ? categoryById.get(item.categoryId) : undefined;
      return {
        key: item.categoryId ?? "uncategorized",
        name: meta?.name ?? "Sem categoria",
        iconType: meta?.iconType ?? "tag",
        color: meta?.color || PALETTE[index % PALETTE.length],
        value: type === "expense" ? item.expense : item.income,
      };
    })
    .sort((a, b) => b.value - a.value);

  const totalValue = rows.reduce((sum, r) => sum + r.value, 0);

  const title = type === "expense" ? "Gastos do mês por categoria" : "Entradas do mês por categoria";
  const emptyMessage = type === "expense" 
    ? "Nenhuma despesa paga registrada neste mês ainda." 
    : "Nenhuma entrada registrada neste mês ainda.";

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      </div>
    );
  }

  const chartConfig: ChartConfig = Object.fromEntries(
    rows.map((r) => [r.key, { label: r.name, color: r.color }])
  );

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-64 w-full max-w-64">
          <PieChart>
            <ChartTooltip
              content={<ChartTooltipContent hideLabel formatter={(value) => formatCurrency(Number(value))} />}
            />
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} strokeWidth={2}>
              {rows.map((row) => (
                <Cell key={row.key} fill={row.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        <ul className="w-full flex-1 space-y-3">
          {rows.map((row) => {
            const Icon = ICON_MAP[row.iconType] ?? Tag;
            const percentage = totalValue > 0 ? Math.round((row.value / totalValue) * 100) : 0;
            return (
              <li key={row.key} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 text-foreground">
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${row.color}22`, color: row.color }}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span>{row.name}</span>
                </div>
                <div className="flex items-baseline gap-2 tabular-nums">
                  <span className="font-medium">{formatCurrency(row.value)}</span>
                  <span className="w-9 text-right text-xs text-muted-foreground">{percentage}%</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

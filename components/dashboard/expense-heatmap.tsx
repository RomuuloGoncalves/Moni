"use client";

import { useHideValues } from "@/lib/hooks/use-hide-values";

interface ExpenseHeatmapProps {
  dailyExpenses: Record<string, number>;
  month: number;
  year: number;
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getIntensity(value: number, max: number): number {
  if (max === 0 || value === 0) return 0;
  return Math.ceil((value / max) * 4); // 1–4
}

const INTENSITY_COLORS = [
  "bg-muted/40",           // 0 — sem gasto
  "bg-expense/20",         // 1 — baixo
  "bg-expense/40",         // 2
  "bg-expense/65",         // 3
  "bg-expense/90",         // 4 — alto
];

export function ExpenseHeatmap({ dailyExpenses, month, year }: ExpenseHeatmapProps) {
  const { hidden } = useHideValues();

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const maxExpense = Math.max(0, ...Object.values(dailyExpenses));

  const totalExpense = Object.values(dailyExpenses).reduce((s, v) => s + v, 0);
  if (totalExpense === 0) return null;

  // Build day cells (with leading empty slots for alignment)
  const cells: Array<{ day: number | null; iso: string | null }> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, iso: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push({ day: d, iso: `${year}-${mm}-${dd}` });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Gastos do mês</h2>
        <span className="text-sm text-muted-foreground tabular-nums">
          {hidden ? "••••" : formatCurrency(totalExpense)}
        </span>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-0.5">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground pb-1">
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (!cell.iso) return <div key={`empty-${i}`} />;
          const amount = dailyExpenses[cell.iso] ?? 0;
          const intensity = getIntensity(amount, maxExpense);
          const isToday = cell.iso === today;
          return (
            <div
              key={cell.iso}
              title={hidden ? `Dia ${cell.day}` : `${cell.day}: ${amount > 0 ? formatCurrency(amount) : "sem gastos"}`}
              className={`
                relative flex aspect-square items-center justify-center rounded-sm text-[10px] font-medium
                ${INTENSITY_COLORS[intensity]}
                ${isToday ? "ring-1 ring-primary" : ""}
                ${amount > 0 ? "text-foreground" : "text-muted-foreground/50"}
              `}
            >
              {cell.day}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground">Menos</span>
        {INTENSITY_COLORS.map((c, i) => (
          <div key={i} className={`h-3 w-3 rounded-sm ${c}`} />
        ))}
        <span className="text-[10px] text-muted-foreground">Mais</span>
      </div>
    </div>
  );
}

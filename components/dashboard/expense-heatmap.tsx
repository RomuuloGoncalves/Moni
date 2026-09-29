"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useHideValues } from "@/lib/hooks/use-hide-values";

interface DayData {
  total: number;
  items: { description: string; amountCents: number }[];
}

interface ExpenseHeatmapProps {
  dailyExpenses: Record<string, DayData>;
  month: number;
  year: number;
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getIntensity(value: number, max: number): number {
  if (max === 0 || value === 0) return 0;
  return Math.ceil((value / max) * 4); // 1–4
}

const INTENSITY_COLORS = [
  "bg-muted/40",
  "bg-expense/20",
  "bg-expense/40",
  "bg-expense/65",
  "bg-expense/90",
];

export function ExpenseHeatmap({ dailyExpenses, month, year }: ExpenseHeatmapProps) {
  const { hidden } = useHideValues();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const maxExpense = Math.max(0, ...Object.values(dailyExpenses).map((d) => d.total));

  const totalExpense = Object.values(dailyExpenses).reduce((s, d) => s + d.total, 0);
  if (totalExpense === 0) return null;

  const cells: Array<{ day: number | null; iso: string | null }> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, iso: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push({ day: d, iso: `${year}-${mm}-${dd}` });
  }

  const today = new Date().toISOString().slice(0, 10);
  const selectedData = selectedDay ? dailyExpenses[selectedDay] : null;

  function formatDayLabel(iso: string) {
    const [y, m, d] = iso.split("-").map(Number);
    return `${d} de ${MONTH_NAMES[m - 1]}`;
  }

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
          <div key={d} className="pb-1 text-center text-[10px] font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (!cell.iso) return <div key={`empty-${i}`} />;
          const data = dailyExpenses[cell.iso];
          const amount = data?.total ?? 0;
          const intensity = getIntensity(amount, maxExpense);
          const isToday = cell.iso === today;
          const isSelected = cell.iso === selectedDay;
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => setSelectedDay((prev) => prev === cell.iso ? null : cell.iso)}
              title={hidden ? `Dia ${cell.day}` : `${cell.day}: ${amount > 0 ? formatCurrency(amount) : "sem gastos"}`}
              className={`
                relative flex aspect-square items-center justify-center rounded-sm text-[10px] font-medium transition-opacity
                ${INTENSITY_COLORS[intensity]}
                ${isToday ? "ring-1 ring-primary" : ""}
                ${isSelected ? "ring-2 ring-primary/80 ring-offset-1" : ""}
                ${amount > 0 ? "cursor-pointer text-foreground hover:opacity-80" : "text-muted-foreground/50"}
              `}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      {/* day detail panel */}
      {selectedDay && (
        <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold">
              {formatDayLabel(selectedDay)}
            </span>
            <div className="flex items-center gap-2">
              {selectedData ? (
                <span className="text-xs font-semibold text-expense tabular-nums">
                  {hidden ? "••••" : formatCurrency(selectedData.total)}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Sem gastos</span>
              )}
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
          {selectedData && selectedData.items.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {selectedData.items.map((item, idx) => (
                <li key={idx} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-muted-foreground">{item.description}</span>
                  <span className="shrink-0 tabular-nums text-expense">
                    {hidden ? "••••" : formatCurrency(item.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

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

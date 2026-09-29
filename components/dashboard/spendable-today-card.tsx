"use client";

import { Wallet } from "lucide-react";
import { useHideValues } from "@/lib/hooks/use-hide-values";

interface SpendableTodayCardProps {
  spendableCents: number;
  month: number;
  year: number;
}

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getRemainingDays(month: number, year: number) {
  const now = new Date();
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Math.max(1, lastDay - now.getUTCDate() + 1);
}

export function SpendableTodayCard({ spendableCents, month, year }: SpendableTodayCardProps) {
  const { hidden } = useHideValues();
  const remainingDays = getRemainingDays(month, year);
  const isHealthy = spendableCents > 0;

  return (
    <div className={`rounded-xl border p-4 flex items-center gap-4 ${isHealthy ? "bg-card" : "border-expense/30 bg-expense/5"}`}>
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${isHealthy ? "bg-income/15" : "bg-expense/15"}`}>
        <Wallet className={`size-5 ${isHealthy ? "text-income" : "text-expense"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">Quanto posso gastar hoje?</p>
        <p className={`text-xl font-bold tabular-nums ${isHealthy ? "text-income" : "text-expense"}`}>
          {hidden ? "••••" : formatCurrency(spendableCents)}
        </p>
        <p className="text-xs text-muted-foreground">
          Saldo disponível ÷ {remainingDays} dia{remainingDays !== 1 ? "s" : ""} restante{remainingDays !== 1 ? "s" : ""} no mês
        </p>
      </div>
    </div>
  );
}

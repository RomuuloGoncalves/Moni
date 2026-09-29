"use client";

import Link from "next/link";
import { AlertCircle, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface PendingItem {
  _id: string;
  description: string;
  amount: number;
  date: string;
  type: string;
}

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isOverdue(dateStr: string) {
  return new Date(dateStr) < new Date(new Date().toDateString());
}

export function PendingTransactionsCard({ items }: { items: PendingItem[] }) {
  if (items.length === 0) return null;

  const overdue = items.filter((i) => isOverdue(i.date));
  const upcoming = items.filter((i) => !isOverdue(i.date));

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="mb-3 flex items-center gap-2">
        <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          {overdue.length > 0
            ? `${overdue.length} lançamento${overdue.length !== 1 ? "s" : ""} vencido${overdue.length !== 1 ? "s" : ""}`
            : `${upcoming.length} a vencer nos próximos 7 dias`}
          {overdue.length > 0 && upcoming.length > 0
            ? ` · ${upcoming.length} a vencer`
            : ""}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {items.slice(0, 5).map((item) => (
          <li key={item._id} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              {item.type === "INCOME"
                ? <ArrowUpCircle className="size-3.5 shrink-0 text-income" />
                : <ArrowDownCircle className="size-3.5 shrink-0 text-expense" />}
              <span className="truncate text-amber-900 dark:text-amber-200">{item.description}</span>
              {isOverdue(item.date) && (
                <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  vencido
                </span>
              )}
            </div>
            <span className={`shrink-0 font-semibold tabular-nums ${item.type === "EXPENSE" ? "text-expense" : "text-income"}`}>
              {item.type === "EXPENSE" ? "-" : "+"}{formatCurrency(item.amount)}
            </span>
          </li>
        ))}
      </ul>
      {items.length > 5 && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          + {items.length - 5} mais
        </p>
      )}
      <Link
        href="/transactions"
        className="mt-3 block text-xs font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
      >
        Ver todas as transações →
      </Link>
    </div>
  );
}

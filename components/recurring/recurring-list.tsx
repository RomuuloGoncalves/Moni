"use client";

import { useState, useTransition, useMemo } from "react";
import { RepeatIcon, Plus, Pause, Play, Trash2, TrendingDown, TrendingUp, BarChart2, Sparkles, Check, X } from "lucide-react";
import {
  createRecurringAction,
  updateRecurringAction,
  deleteRecurringAction,
} from "@/app/(dashboard)/recurring/actions";
import type { RecurringFrequency, RecurringType } from "@/models/RecurringTransaction";

interface RecurringItem {
  _id: string;
  accountId: string;
  categoryId?: string;
  type: RecurringType;
  amountCents: number;
  description: string;
  frequency: RecurringFrequency;
  nextDueDate: string;
  isActive: boolean;
}

interface Account { _id: string; name: string }
interface Category { _id: string; name: string; color: string }

const FREQ_LABELS: Record<RecurringFrequency, string> = {
  MONTHLY: "Mensal",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quinzenal",
  YEARLY: "Anual",
};

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

interface Suggestion {
  description: string;
  type: RecurringType;
  averageAmountCents: number;
  frequency: RecurringFrequency;
  occurrences: number;
  categoryId: string | null;
  accountId: string;
  lastDate: string;
}

interface SuggestionsPanelProps {
  suggestions: Suggestion[];
  accounts: Account[];
  categories: Category[];
  onAdded: (item: RecurringItem) => void;
}

function SuggestionsPanel({ suggestions, accounts, categories, onAdded }: SuggestionsPanelProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const visible = suggestions.filter((s) => !dismissed.has(s.description));
  if (visible.length === 0) return null;

  function handleAdd(s: Suggestion) {
    setPending((p) => new Set(p).add(s.description));
    startTransition(async () => {
      const res = await createRecurringAction({
        accountId: s.accountId,
        categoryId: s.categoryId ?? undefined,
        type: s.type,
        amountCents: s.averageAmountCents,
        description: s.description,
        frequency: s.frequency,
        startDate: s.lastDate.slice(0, 10),
      });
      if (!res.error && res.data) {
        onAdded({
          _id: res.data._id,
          accountId: s.accountId,
          categoryId: s.categoryId ?? undefined,
          type: s.type,
          amountCents: s.averageAmountCents,
          description: s.description,
          frequency: s.frequency,
          nextDueDate: s.lastDate,
          isActive: true,
        });
      }
      setDismissed((d) => new Set(d).add(s.description));
      setPending((p) => { const n = new Set(p); n.delete(s.description); return n; });
    });
  }

  function handleDismiss(description: string) {
    setDismissed((d) => new Set(d).add(description));
  }

  return (
    <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <span className="text-sm font-semibold">Identificados automaticamente</span>
        <span className="ml-auto text-xs text-muted-foreground">{visible.length} padrão{visible.length !== 1 ? "s" : ""} detectado{visible.length !== 1 ? "s" : ""}</span>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">
        Baseado no seu histórico dos últimos 6 meses. Confirme ou ignore cada sugestão.
      </p>
      <div className="flex flex-col gap-2">
        {visible.map((s) => {
          const category = categories.find((c) => c._id === s.categoryId);
          const account = accounts.find((a) => a._id === s.accountId);
          const isLoading = pending.has(s.description);
          return (
            <div key={s.description} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] font-semibold uppercase ${s.type === "INCOME" ? "text-income" : "text-expense"}`}>
                    {s.type === "INCOME" ? "Receita" : "Despesa"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{FREQ_LABELS[s.frequency]}</span>
                  <span className="text-[10px] text-muted-foreground">· {s.occurrences}× em 6m</span>
                  {category && (
                    <span className="rounded-full px-1.5 py-0.5 text-[10px]" style={{ background: category.color + "22", color: category.color }}>
                      {category.name}
                    </span>
                  )}
                </div>
                <span className="font-medium truncate">{s.description}</span>
                <span className="text-xs text-muted-foreground">
                  {account?.name} · ~{formatCurrency(s.averageAmountCents)}
                </span>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => handleAdd(s)}
                  disabled={isLoading}
                  title="Adicionar como recorrente"
                  className="rounded-md p-1.5 text-primary hover:bg-primary/10 disabled:opacity-50"
                >
                  <Check className="size-4" />
                </button>
                <button
                  onClick={() => handleDismiss(s.description)}
                  title="Ignorar sugestão"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Monthly multipliers for normalizing different frequencies
const MONTHLY_FACTOR: Record<RecurringFrequency, number> = {
  MONTHLY:  1,
  WEEKLY:   52 / 12,   // ~4.33
  BIWEEKLY: 26 / 12,   // ~2.17
  YEARLY:   1 / 12,
};

function monthlyEquivalent(item: RecurringItem) {
  return Math.round(item.amountCents * MONTHLY_FACTOR[item.frequency]);
}

interface SummaryProps {
  items: RecurringItem[];
  categories: Category[];
}

function RecurringSummary({ items, categories }: SummaryProps) {
  const active = items.filter((i) => i.isActive);
  if (active.length === 0) return null;

  const expenses = active.filter((i) => i.type === "EXPENSE");
  const incomes  = active.filter((i) => i.type === "INCOME");

  const totalExpense = expenses.reduce((s, i) => s + monthlyEquivalent(i), 0);
  const totalIncome  = incomes.reduce((s, i) => s + monthlyEquivalent(i), 0);
  const balance      = totalIncome - totalExpense;

  // Group expenses by category, sorted descending
  const byCategory = new Map<string, { name: string; color: string; totalCents: number; count: number }>();
  for (const item of expenses) {
    const cat = categories.find((c) => c._id === item.categoryId);
    const key = item.categoryId ?? "__none__";
    const existing = byCategory.get(key) ?? {
      name:       cat?.name  ?? "Sem categoria",
      color:      cat?.color ?? "#94a3b8",
      totalCents: 0,
      count:      0,
    };
    existing.totalCents += monthlyEquivalent(item);
    existing.count      += 1;
    byCategory.set(key, existing);
  }

  const ranked = [...byCategory.values()].sort((a, b) => b.totalCents - a.totalCents);
  const maxCents = ranked[0]?.totalCents ?? 1;

  // Top individual expenses
  const topItems = [...expenses]
    .sort((a, b) => monthlyEquivalent(b) - monthlyEquivalent(a))
    .slice(0, 5);

  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <BarChart2 className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Visão mensal recorrente</h2>
        <span className="ml-auto text-[10px] text-muted-foreground">equivalente/mês</span>
      </div>

      {/* Totals row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <TrendingDown className="size-3" /> Despesas
          </span>
          <span className="text-base font-bold tabular-nums text-expense">
            {formatCurrency(totalExpense)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <TrendingUp className="size-3" /> Receitas
          </span>
          <span className="text-base font-bold tabular-nums text-income">
            {formatCurrency(totalIncome)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Saldo</span>
          <span className={`text-base font-bold tabular-nums ${balance >= 0 ? "text-income" : "text-expense"}`}>
            {formatCurrency(Math.abs(balance))}
            <span className="text-xs font-normal text-muted-foreground ml-1">{balance >= 0 ? "sobra" : "déficit"}</span>
          </span>
        </div>
      </div>

      {/* Category breakdown */}
      {ranked.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-muted-foreground">Despesas por categoria</p>
          {ranked.map((cat) => {
            const pct = (cat.totalCents / maxCents) * 100;
            const share = totalExpense > 0 ? ((cat.totalCents / totalExpense) * 100).toFixed(0) : "0";
            return (
              <div key={cat.name} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ background: cat.color }}
                    />
                    <span className="truncate font-medium">{cat.name}</span>
                    <span className="text-muted-foreground">({cat.count})</span>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="text-muted-foreground">{share}%</span>
                    <span className="font-semibold text-expense">{formatCurrency(cat.totalCents)}</span>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: cat.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Top individual items */}
      {topItems.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-muted-foreground">Maiores gastos individuais</p>
          {topItems.map((item, idx) => (
            <div key={item._id} className="flex items-center gap-2 text-xs">
              <span className="size-4 shrink-0 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                {idx + 1}
              </span>
              <span className="truncate flex-1">{item.description}</span>
              <span className="shrink-0 tabular-nums font-semibold text-expense">
                {formatCurrency(monthlyEquivalent(item))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
      <RepeatIcon className="size-10 opacity-30" />
      <p className="text-sm">Nenhuma transação recorrente cadastrada.</p>
    </div>
  );
}

interface CreateFormProps {
  accounts: Account[];
  categories: Category[];
  onDone: (item: RecurringItem) => void;
  onCancel: () => void;
}

function CreateForm({ accounts, categories, onDone, onCancel }: CreateFormProps) {
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<RecurringType>("EXPENSE");
  const [accountId, setAccountId] = useState(accounts[0]?._id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [frequency, setFrequency] = useState<RecurringFrequency>("MONTHLY");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountCents = Math.round(parseFloat(amountStr.replace(",", ".")) * 100);
    if (!amountCents || amountCents <= 0) { setError("Valor inválido"); return; }
    if (!description.trim()) { setError("Descrição obrigatória"); return; }
    setError("");
    startTransition(async () => {
      const res = await createRecurringAction({
        accountId, categoryId: categoryId || undefined, type,
        amountCents, description: description.trim(), frequency, startDate,
      });
      if (res.error) { setError(res.error); return; }
      onDone({
        _id: res.data!._id, accountId, categoryId: categoryId || undefined,
        type, amountCents, description: description.trim(), frequency,
        nextDueDate: startDate, isActive: true,
      });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-4 flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Nova recorrente</h3>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as RecurringType)}
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            <option value="EXPENSE">Despesa</option>
            <option value="INCOME">Receita</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Frequência</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            {Object.entries(FREQ_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 col-span-2 sm:col-span-2">
          <label className="text-xs text-muted-foreground">Descrição</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Aluguel"
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Valor (R$)</label>
          <input
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Conta</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            {accounts.map((a) => (
              <option key={a._id} value={a._id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Categoria</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            <option value="">— nenhuma —</option>
            {categories.filter((c) => {
              // Show only relevant categories
              return true;
            }).map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Primeira data</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
            required
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}

interface RecurringRowProps {
  item: RecurringItem;
  accounts: Account[];
  categories: Category[];
  onDelete: (id: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
}

function RecurringRow({ item, accounts, categories, onDelete, onToggle }: RecurringRowProps) {
  const [isPending, startTransition] = useTransition();
  const account = accounts.find((a) => a._id === item.accountId);
  const category = categories.find((c) => c._id === item.categoryId);

  function handleToggle() {
    startTransition(async () => {
      const res = await updateRecurringAction(item._id, { isActive: !item.isActive });
      if (!res.error) onToggle(item._id, !item.isActive);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteRecurringAction(item._id);
      if (!res.error) onDelete(item._id);
    });
  }

  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-opacity ${!item.isActive ? "opacity-50" : ""}`}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold uppercase ${item.type === "INCOME" ? "text-income" : "text-expense"}`}>
            {item.type === "INCOME" ? "Receita" : "Despesa"}
          </span>
          <span className="text-[10px] text-muted-foreground">{FREQ_LABELS[item.frequency]}</span>
          {category && (
            <span className="rounded-full px-1.5 py-0.5 text-[10px]" style={{ background: category.color + "22", color: category.color }}>
              {category.name}
            </span>
          )}
        </div>
        <span className="font-medium truncate">{item.description}</span>
        <span className="text-xs text-muted-foreground">
          {account?.name} · próxima: {formatDate(item.nextDueDate)}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className={`font-semibold tabular-nums ${item.type === "INCOME" ? "text-income" : "text-expense"}`}>
          {item.type === "EXPENSE" ? "-" : "+"}{formatCurrency(item.amountCents)}
        </span>
        <div className="flex gap-1">
          <button
            onClick={handleToggle}
            disabled={isPending}
            title={item.isActive ? "Pausar" : "Reativar"}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            {item.isActive ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            title="Excluir"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface RecurringListProps {
  initialItems: RecurringItem[];
  accounts: Account[];
  categories: Category[];
  suggestions?: Suggestion[];
}

export function RecurringList({ initialItems, accounts, categories, suggestions = [] }: RecurringListProps) {
  const [items, setItems] = useState<RecurringItem[]>(initialItems);
  const [showForm, setShowForm] = useState(false);

  function handleCreated(item: RecurringItem) {
    setItems((prev) => [...prev, item]);
    setShowForm(false);
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i._id !== id));
  }

  function handleToggle(id: string, isActive: boolean) {
    setItems((prev) => prev.map((i) => i._id === id ? { ...i, isActive } : i));
  }

  const active = items.filter((i) => i.isActive);
  const paused = items.filter((i) => !i.isActive);

  return (
    <div className="flex flex-col gap-4">
      <SuggestionsPanel
        suggestions={suggestions}
        accounts={accounts}
        categories={categories}
        onAdded={(item) => setItems((prev) => [...prev, item])}
      />
      <RecurringSummary items={items} categories={categories} />
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length === 0 ? "Nenhuma" : `${active.length} ativa${active.length !== 1 ? "s" : ""}`}
          {paused.length > 0 ? ` · ${paused.length} pausada${paused.length !== 1 ? "s" : ""}` : ""}
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-3.5" />
          Nova recorrente
        </button>
      </div>

      {showForm && (
        <CreateForm
          accounts={accounts}
          categories={categories}
          onDone={handleCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      {items.length === 0 && !showForm ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-2">
          {active.map((item) => (
            <RecurringRow
              key={item._id}
              item={item}
              accounts={accounts}
              categories={categories}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
          {paused.length > 0 && (
            <>
              <p className="mt-2 text-xs font-medium text-muted-foreground">Pausadas</p>
              {paused.map((item) => (
                <RecurringRow
                  key={item._id}
                  item={item}
                  accounts={accounts}
                  categories={categories}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

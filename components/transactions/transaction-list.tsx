"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createTransactionAction,
  updateTransactionAction,
  deleteTransactionAction,
  setPaidAction,
  suggestCategoryAction,
  listTransactionsAction,
  updateTagsAction,
} from "@/app/(dashboard)/transactions/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  Trash2,
  Plus,
  CalendarRange,
  Search,
  Pencil,
  Download,
  TagIcon,
  X,
  Utensils, Coffee, ShoppingBag, ShoppingCart, Car, Bus, Train, Plane, Fuel,
  Home, Building2, Wrench, Lightbulb, Droplet, Wifi, Phone, Tv, Music, Film,
  Gamepad2, Dumbbell, HeartPulse, Pill, Stethoscope, Baby, Dog, Cat, Shirt,
  Scissors, GraduationCap, Briefcase, Gift, PiggyBank, Wallet, CreditCard,
  Banknote, TrendingUp, Palmtree, Umbrella, Church, Landmark, Receipt, Shield,
  Book, Heart, Tag,
  type LucideIcon,
} from "lucide-react";

// ─── category icon map (mirrors category-list.tsx) ───────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils, coffee: Coffee, "shopping-bag": ShoppingBag,
  "shopping-cart": ShoppingCart, car: Car, bus: Bus, train: Train, plane: Plane,
  fuel: Fuel, home: Home, building: Building2, wrench: Wrench,
  lightbulb: Lightbulb, droplet: Droplet, wifi: Wifi, phone: Phone, tv: Tv,
  music: Music, film: Film, gamepad: Gamepad2, dumbbell: Dumbbell,
  "heart-pulse": HeartPulse, pill: Pill, stethoscope: Stethoscope, baby: Baby,
  dog: Dog, cat: Cat, shirt: Shirt, scissors: Scissors,
  "graduation-cap": GraduationCap, briefcase: Briefcase, gift: Gift,
  "piggy-bank": PiggyBank, wallet: Wallet, "credit-card": CreditCard,
  banknote: Banknote, "trending-up": TrendingUp, palmtree: Palmtree,
  umbrella: Umbrella, church: Church, landmark: Landmark, receipt: Receipt,
  shield: Shield, book: Book, heart: Heart, tag: Tag,
};

function CategoryIcon({ iconType, color }: { iconType: string; color: string }) {
  const Icon = ICON_MAP[iconType] ?? Tag;
  return (
    <span
      className="flex size-6 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: `${color}22`, color }}
    >
      <Icon className="size-3.5" aria-hidden="true" />
    </span>
  );
}

// ─── types ───────────────────────────────────────────────────────────────────

type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";

interface TransactionItem {
  _id: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  isPaid: boolean;
  tags?: string[];
}

interface AccountOption { _id: string; name: string }
interface CategoryOption { _id: string; name: string; color: string; iconType: string }

// ─── helpers ─────────────────────────────────────────────────────────────────

function centsToInput(cents: number): string { return (cents / 100).toFixed(2) }
function inputToCents(value: string): number { return Math.round(Number.parseFloat(value || "0") * 100) }
function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function exportToCsv(
  transactions: TransactionItem[],
  accounts: AccountOption[],
  categories: CategoryOption[]
) {
  const accountNameById = new Map(accounts.map((a) => [a._id, a.name]));
  const categoryNameById = new Map(categories.map((c) => [c._id, c.name]));
  const TYPE_PT: Record<string, string> = { INCOME: "Receita", EXPENSE: "Despesa", TRANSFER: "Transferência" };
  const headers = ["Data", "Descrição", "Tipo", "Valor (R$)", "Categoria", "Conta", "Status"];
  const rows = transactions.map((t) => [
    new Date(t.date).toLocaleDateString("pt-BR"),
    `"${t.description.replace(/"/g, '""')}"`,
    TYPE_PT[t.type] ?? t.type,
    (t.amount / 100).toFixed(2).replace(".", ","),
    t.categoryId ? (categoryNameById.get(t.categoryId) ?? "") : "",
    accountNameById.get(t.accountId) ?? "",
    t.isPaid ? "Pago" : "Pendente",
  ]);
  const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `moni-transacoes-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function monthToRange(month: string): { from: Date; to: Date } {
  const [year, monthIndex] = month.split("-").map(Number);
  return {
    from: new Date(Date.UTC(year, monthIndex - 1, 1, 0, 0, 0, 0)),
    to:   new Date(Date.UTC(year, monthIndex, 0, 23, 59, 59, 999)),
  };
}

function TypeIcon({ type }: { type: TransactionType }) {
  if (type === "INCOME")   return <ArrowUpCircle   className="h-4 w-4 shrink-0 text-income" aria-label="Receita" />;
  if (type === "EXPENSE")  return <ArrowDownCircle className="h-4 w-4 shrink-0 text-expense" aria-label="Despesa" />;
  return <ArrowLeftRight className="h-4 w-4 shrink-0 text-blue-500" aria-label="Transferência" />;
}

// ─── tags editor ─────────────────────────────────────────────────────────────

// Derives all unique tags used across a transaction list
function allTags(transactions: TransactionItem[]): string[] {
  const set = new Set<string>();
  for (const t of transactions) for (const tag of t.tags ?? []) set.add(tag);
  return [...set].sort();
}

function TagsEditor({ transactionId, initialTags, allExisting, onSave }: {
  transactionId: string;
  initialTags: string[];
  allExisting: string[]; // tags already used in the list → shown as suggestions
  onSave: (tags: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();

  function toggle(tag: string) {
    setTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const tag = input.trim().toLowerCase();
      if (tag && !tags.includes(tag)) setTags((p) => [...p, tag]);
      setInput("");
    }
    if (e.key === "Escape") setOpen(false);
  }

  function handleSave() {
    startTransition(async () => {
      await updateTagsAction(transactionId, tags);
      onSave(tags);
      setOpen(false);
    });
  }

  const suggestions = allExisting.filter((t) => !tags.includes(t) && t.includes(input.toLowerCase()));

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-1 mt-1">
        {initialTags.map((t) => (
          <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {t}
          </span>
        ))}
        <button
          onClick={() => { setTags(initialTags); setInput(""); setOpen(true); }}
          className="flex items-center gap-0.5 rounded-full border border-dashed px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:text-primary"
        >
          <TagIcon className="size-2.5" />
          {initialTags.length === 0 ? "tag" : "+"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1.5 flex flex-col gap-1.5 rounded-lg border bg-card p-2.5 shadow-sm">
      {/* Tags currently selected */}
      <div className="flex flex-wrap gap-1">
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => toggle(t)}
            className="flex items-center gap-0.5 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-destructive/15 hover:text-destructive"
          >
            {t} <X className="size-2.5" />
          </button>
        ))}
        {tags.length === 0 && <span className="text-[10px] text-muted-foreground">Nenhuma tag</span>}
      </div>

      {/* Existing tags as one-click suggestions */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-[10px] text-muted-foreground mr-0.5">Usar:</span>
          {suggestions.map((t) => (
            <button
              key={t}
              onClick={() => toggle(t)}
              className="rounded-full border border-dashed px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:text-primary"
            >
              + {t}
            </button>
          ))}
        </div>
      )}

      {/* Input for new tags */}
      <input
        autoFocus
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nova tag (Enter para adicionar)…"
        className="rounded-md border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
      />

      <div className="flex gap-1.5">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded px-2.5 py-1 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "…" : "Salvar"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded px-2.5 py-1 text-[11px] border hover:bg-accent"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── delete confirmation dialog ──────────────────────────────────────────────

function DeleteDialog({ onConfirm, disabled }: { onConfirm: () => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:text-destructive"
            aria-label="Excluir transação"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir transação</DialogTitle>
          <DialogDescription>Essa ação não pode ser desfeita.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={disabled}
            onClick={() => { setOpen(false); onConfirm(); }}
          >
            Excluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── edit transaction dialog ─────────────────────────────────────────────────

function EditTransactionDialog({
  item,
  accounts,
  categories,
  onSave,
  disabled,
}: {
  item: TransactionItem;
  accounts: AccountOption[];
  categories: CategoryOption[];
  onSave: (updated: TransactionItem) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  const [type, setType]           = useState<TransactionType>(item.type);
  const [accountId, setAccountId] = useState(item.accountId);
  const [toAccountId, setToAccountId] = useState(item.toAccountId ?? accounts[1]?._id ?? accounts[0]?._id ?? "");
  const [categoryId, setCategoryId]   = useState(item.categoryId ?? categories[0]?._id ?? "");
  const [amount, setAmount]   = useState(centsToInput(item.amount));
  const [date, setDate]       = useState(item.date.slice(0, 10));
  const [description, setDescription] = useState(item.description);
  const [isPaid, setIsPaid]   = useState(item.isPaid);

  function handleOpenChange(next: boolean) {
    if (next) {
      setType(item.type);
      setAccountId(item.accountId);
      setToAccountId(item.toAccountId ?? accounts[1]?._id ?? accounts[0]?._id ?? "");
      setCategoryId(item.categoryId ?? categories[0]?._id ?? "");
      setAmount(centsToInput(item.amount));
      setDate(item.date.slice(0, 10));
      setDescription(item.description);
      setIsPaid(item.isPaid);
      setError(undefined);
    }
    setOpen(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await updateTransactionAction(item._id, {
        type,
        accountId,
        toAccountId: type === "TRANSFER" ? toAccountId : undefined,
        categoryId:  type === "TRANSFER" ? undefined : categoryId,
        amount: inputToCents(amount),
        date: new Date(date),
        description,
        isPaid: type === "TRANSFER" ? true : isPaid,
      });
      if (result.error) { setError(result.error); return; }
      onSave(result.data as TransactionItem);
      setOpen(false);
    });
  }

  const TYPE_LABELS: Record<TransactionType, string> = {
    INCOME: "Receita", EXPENSE: "Despesa", TRANSFER: "Transferência",
  };
  const accountNameById = useMemo(() => new Map(accounts.map((a) => [a._id, a.name])), [accounts]);
  const categoryNameById = useMemo(() => new Map(categories.map((c) => [c._id, c.name])), [categories]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label="Editar transação"
            disabled={disabled}
          >
            <Pencil className="h-4 w-4" />
          </button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar transação</DialogTitle>
          <DialogDescription>Altere os dados da transação.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as TransactionType)}>
                <SelectTrigger>
                  <SelectValue>{(v: TransactionType) => TYPE_LABELS[v] ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Receita</SelectItem>
                  <SelectItem value="EXPENSE">Despesa</SelectItem>
                  <SelectItem value="TRANSFER">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>{type === "TRANSFER" ? "Conta origem" : "Conta"}</Label>
              <Select value={accountId} onValueChange={(v) => setAccountId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Conta">
                    {(v: string) => accountNameById.get(v) ?? "Conta"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {type === "TRANSFER" ? (
              <div className="flex flex-col gap-2">
                <Label>Conta destino</Label>
                <Select value={toAccountId} onValueChange={(v) => setToAccountId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Conta destino">
                      {(v: string) => accountNameById.get(v) ?? "Conta destino"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Categoria">
                      {(v: string) => categoryNameById.get(v) ?? "Categoria"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`edit-amount-${item._id}`}>Valor (R$)</Label>
              <Input
                id={`edit-amount-${item._id}`}
                type="number" step="0.01" min="0.01" max="1000000"
                value={amount} onChange={(e) => setAmount(e.target.value)} required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`edit-date-${item._id}`}>Data</Label>
              <Input
                id={`edit-date-${item._id}`}
                type="date" value={date} onChange={(e) => setDate(e.target.value)} required
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor={`edit-desc-${item._id}`}>Descrição</Label>
              <Input
                id={`edit-desc-${item._id}`}
                value={description} onChange={(e) => setDescription(e.target.value)}
                maxLength={200} required
              />
            </div>
            {type !== "TRANSFER" && (
              <div className="flex flex-col justify-end gap-2 pb-2">
                <Label className="flex items-center gap-2">
                  <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
                  Paga
                </Label>
              </div>
            )}
          </div>

          <div>
            <Button type="submit" disabled={isPending}>Salvar</Button>
          </div>
        </form>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function TransactionList({
  initialTransactions,
  accounts,
  categories,
  initialMonth = "",
}: {
  initialTransactions: TransactionItem[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  initialMonth?: string;
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [monthFilter, setMonthFilter] = useState(initialMonth);
  const [search, setSearch] = useState("");
  const [isFiltering, startFilterTransition] = useTransition();

  const [type, setType]           = useState<TransactionType>("EXPENSE");
  const [accountId, setAccountId] = useState(accounts[0]?._id ?? "");
  const [toAccountId, setToAccountId] = useState(accounts[1]?._id ?? accounts[0]?._id ?? "");
  const [categoryId, setCategoryId]   = useState(categories[0]?._id ?? "");
  const [amount, setAmount]   = useState("");
  const [date, setDate]       = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [isPaid, setIsPaid]   = useState(true);

  const accountNameById = useMemo(() => new Map(accounts.map((a) => [a._id, a.name])), [accounts]);
  const categoryById    = useMemo(() => new Map(categories.map((c) => [c._id, c])), [categories]);

  const TYPE_LABELS: Record<TransactionType, string> = {
    INCOME: "Receita", EXPENSE: "Despesa", TRANSFER: "Transferência",
  };

  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const existingTags = useMemo(() => allTags(transactions), [transactions]);

  const filtered = useMemo(() => {
    let result = transactions;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((t) => t.description.toLowerCase().includes(q));
    }
    if (tagFilter) {
      result = result.filter((t) => t.tags?.includes(tagFilter));
    }
    return result;
  }, [transactions, search, tagFilter]);

  const tagFilterTotal = useMemo(() => {
    if (!tagFilter) return null;
    const income  = filtered.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
    return { income, expense };
  }, [filtered, tagFilter]);

  function resetForm() { setAmount(""); setDescription(""); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await createTransactionAction({
        accountId,
        toAccountId: type === "TRANSFER" ? toAccountId : undefined,
        categoryId:  type === "TRANSFER" ? undefined : categoryId,
        type,
        amount: inputToCents(amount),
        date: new Date(date),
        description,
        isPaid: type === "TRANSFER" ? true : isPaid,
      });
      if (result.error) { setError(result.error); return; }
      setTransactions((prev) => [result.data as TransactionItem, ...prev]);
      resetForm();
      setOpen(false);
    });
  }

  function handleDelete(id: string) {
    setError(undefined);
    startTransition(async () => {
      const result = await deleteTransactionAction(id);
      if (result.error) { setError(result.error); return; }
      setTransactions((prev) => prev.filter((t) => t._id !== id));
    });
  }

  function handleEdit(updated: TransactionItem) {
    setTransactions((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
  }

  function handleMonthChange(value: string) {
    setMonthFilter(value);
    setSearch("");
    setError(undefined);
    startFilterTransition(async () => {
      const filters = value ? monthToRange(value) : {};
      const result = await listTransactionsAction(filters);
      if (result.error) { setError(result.error); return; }
      setTransactions((result.data as TransactionItem[]) ?? []);
    });
  }

  function handleTogglePaid(item: TransactionItem) {
    setError(undefined);
    startTransition(async () => {
      const result = await setPaidAction(item._id, !item.isPaid);
      if (result.error) { setError(result.error); return; }
      setTransactions((prev) => prev.map((t) => (t._id === item._id ? { ...t, isPaid: !t.isPaid } : t)));
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transações</h1>
          <p className="text-sm text-muted-foreground">
            Registre receitas, despesas e transferências e acompanhe seu saldo.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button size="default" className="shrink-0 gap-1.5">
                <Plus className="size-4" />
                Nova
              </Button>
            }
          />
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova transação</DialogTitle>
              <DialogDescription>Registre uma receita, despesa ou transferência.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-3">
                <div className="flex flex-col gap-2">
                  <Label>Tipo</Label>
                  <Select value={type} onValueChange={(v) => setType(v as TransactionType)}>
                    <SelectTrigger>
                      <SelectValue>{(v: TransactionType) => TYPE_LABELS[v] ?? v}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INCOME">Receita</SelectItem>
                      <SelectItem value="EXPENSE">Despesa</SelectItem>
                      <SelectItem value="TRANSFER">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>{type === "TRANSFER" ? "Conta origem" : "Conta"}</Label>
                  <Select value={accountId} onValueChange={(v) => setAccountId(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Conta">
                        {(v: string) => accountNameById.get(v) ?? "Conta"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {type === "TRANSFER" ? (
                  <div className="flex flex-col gap-2">
                    <Label>Conta destino</Label>
                    <Select value={toAccountId} onValueChange={(v) => setToAccountId(v ?? "")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Conta destino">
                          {(v: string) => accountNameById.get(v) ?? "Conta destino"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Label>Categoria</Label>
                    <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Categoria">
                          {(v: string) => new Map(categories.map((c) => [c._id, c.name])).get(v) ?? "Categoria"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="tx-amount">Valor (R$)</Label>
                  <Input
                    id="tx-amount" type="number" step="0.01" min="0.01" max="1000000"
                    value={amount} onChange={(e) => setAmount(e.target.value)} required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="tx-date">Data</Label>
                  <Input
                    id="tx-date" type="date" value={date}
                    onChange={(e) => setDate(e.target.value)} required
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor="tx-description">Descrição</Label>
                  <Input
                    id="tx-description" value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => {
                      if (type === "TRANSFER" || !description.trim()) return;
                      startTransition(async () => {
                        const result = await suggestCategoryAction(description);
                        if (result.data) setCategoryId(result.data);
                      });
                    }}
                    maxLength={200} required
                  />
                </div>
                {type !== "TRANSFER" && (
                  <div className="flex flex-col justify-end gap-2 pb-2">
                    <Label className="flex items-center gap-2">
                      <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
                      Paga
                    </Label>
                  </div>
                )}
              </div>

              <div>
                <Button type="submit" disabled={isPending}>Criar</Button>
              </div>
            </form>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </DialogContent>
        </Dialog>
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="tx-month-filter" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarRange className="size-4" aria-hidden="true" />
          Mês
        </Label>
        <Input
          id="tx-month-filter"
          type="month"
          value={monthFilter}
          onChange={(e) => handleMonthChange(e.target.value)}
          className="w-40"
          aria-label="Filtrar por mês"
        />
        {monthFilter && (
          <Button type="button" variant="ghost" size="sm" disabled={isFiltering}
            onClick={() => handleMonthChange("")}>
            Limpar
          </Button>
        )}
        <div className="relative ml-auto w-full sm:w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar descrição…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
            aria-label="Buscar transações"
          />
        </div>
        {filtered.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => exportToCsv(filtered, accounts, categories)}
          >
            <Download className="size-3.5" />
            CSV
          </Button>
        )}
      </div>

      {/* tag filter bar */}
      {existingTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <TagIcon className="size-3.5 shrink-0 text-muted-foreground" />
          {existingTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter((prev) => prev === tag ? null : tag)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                tagFilter === tag
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              }`}
            >
              {tag}
            </button>
          ))}
          {tagFilter && (
            <button
              onClick={() => setTagFilter(null)}
              className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" /> limpar
            </button>
          )}
        </div>
      )}

      {/* tag filter subtotal */}
      {tagFilter && tagFilterTotal && (
        <div className="flex items-center gap-4 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
          <span className="font-medium text-primary">#{tagFilter}</span>
          {tagFilterTotal.income > 0 && (
            <span className="text-income">+{formatCurrency(tagFilterTotal.income)}</span>
          )}
          {tagFilterTotal.expense > 0 && (
            <span className="text-expense">−{formatCurrency(tagFilterTotal.expense)}</span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} transaç{filtered.length !== 1 ? "ões" : "ão"}
          </span>
        </div>
      )}

      {/* list */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {search ? "Nenhuma transação encontrada para essa busca." : "Nenhuma transação registrada ainda."}
          </p>
        ) : (
          filtered.map((t) => {
            const cat = t.categoryId ? categoryById.get(t.categoryId) : undefined;
            return (
              <div
                key={t._id}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-border/70 bg-card p-3 shadow-card"
              >
                <div className="flex min-w-0 flex-1 basis-56 items-center gap-2">
                  <TypeIcon type={t.type} />
                  {cat ? (
                    <CategoryIcon iconType={cat.iconType} color={cat.color} />
                  ) : (
                    <span className="size-6 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.date).toLocaleDateString("pt-BR")} ·{" "}
                      {accountNameById.get(t.accountId) ?? "?"}
                      {t.toAccountId ? ` → ${accountNameById.get(t.toAccountId) ?? "?"}` : ""}
                      {cat ? ` · ${cat.name}` : ""}
                    </p>
                    <TagsEditor
                      transactionId={t._id}
                      initialTags={t.tags ?? []}
                      allExisting={existingTags}
                      onSave={(tags) => setTransactions((prev) => prev.map((tx) => tx._id === t._id ? { ...tx, tags } : tx))}
                    />
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className={`text-sm font-semibold tabular-nums ${t.type === "EXPENSE" ? "text-expense" : "text-income"}`}>
                    {t.type === "EXPENSE" ? "-" : "+"}
                    {formatCurrency(t.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTogglePaid(t)}
                    className={`rounded-full border px-2 py-0.5 text-xs ${
                      t.isPaid ? "border-income text-income" : "border-muted-foreground text-muted-foreground"
                    }`}
                  >
                    {t.isPaid ? "Paga" : "Pendente"}
                  </button>
                  <EditTransactionDialog
                    item={t}
                    accounts={accounts}
                    categories={categories}
                    onSave={handleEdit}
                    disabled={isPending}
                  />
                  <DeleteDialog onConfirm={() => handleDelete(t._id)} disabled={isPending} />
                </div>
              </div>
            );
          })
        )}
        {filtered.length > 0 && search && (
          <p className="text-xs text-muted-foreground">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} para &ldquo;{search}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

export default TransactionList;

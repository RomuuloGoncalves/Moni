"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createTransactionAction,
  updateTransactionAction,
  deleteTransactionAction,
  setPaidAction,
  suggestCategoryAction,
  listTransactionsAction,
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
} from "lucide-react";

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
}

interface AccountOption {
  _id: string;
  name: string;
}

interface CategoryOption {
  _id: string;
  name: string;
  color: string;
  iconType: string;
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function inputToCents(value: string): number {
  return Math.round(Number.parseFloat(value || "0") * 100);
}

function TypeIcon({ type }: { type: TransactionType }) {
  if (type === "INCOME") {
    return <ArrowUpCircle className="h-4 w-4 text-income" aria-label="Receita" />;
  }
  if (type === "EXPENSE") {
    return <ArrowDownCircle className="h-4 w-4 text-expense" aria-label="Despesa" />;
  }
  return <ArrowLeftRight className="h-4 w-4 text-blue-600" aria-label="Transferência" />;
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** TXN-04: "YYYY-MM" -> inclusive [from, to] range covering that whole month. */
function monthToRange(month: string): { from: Date; to: Date } {
  const [year, monthIndex] = month.split("-").map(Number);
  const from = new Date(Date.UTC(year, monthIndex - 1, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, monthIndex, 0, 23, 59, 59, 999));
  return { from, to };
}

export function TransactionList({
  initialTransactions,
  accounts,
  categories,
}: {
  initialTransactions: TransactionItem[];
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [monthFilter, setMonthFilter] = useState("");
  const [isFiltering, startFilterTransition] = useTransition();

  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [accountId, setAccountId] = useState(accounts[0]?._id ?? "");
  const [toAccountId, setToAccountId] = useState(accounts[1]?._id ?? accounts[0]?._id ?? "");
  const [categoryId, setCategoryId] = useState(categories[0]?._id ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [isPaid, setIsPaid] = useState(true);

  const accountNameById = useMemo(() => {
    const map = new Map(accounts.map((a) => [a._id, a.name]));
    return map;
  }, [accounts]);

  const categoryNameById = useMemo(() => {
    const map = new Map(categories.map((c) => [c._id, c.name]));
    return map;
  }, [categories]);

  const TYPE_LABELS: Record<TransactionType, string> = {
    INCOME: "Receita",
    EXPENSE: "Despesa",
    TRANSFER: "Transferência",
  };

  function resetForm() {
    setAmount("");
    setDescription("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const amountCents = inputToCents(amount);

    startTransition(async () => {
      const result = await createTransactionAction({
        accountId,
        toAccountId: type === "TRANSFER" ? toAccountId : undefined,
        categoryId: type === "TRANSFER" ? undefined : categoryId,
        type,
        amount: amountCents,
        date: new Date(date),
        description,
        isPaid: type === "TRANSFER" ? true : isPaid,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setTransactions((prev) => [result.data as TransactionItem, ...prev]);
      resetForm();
      setOpen(false);
    });
  }

  function handleDelete(id: string) {
    setError(undefined);
    if (!confirm("Excluir esta transação?")) {
      return;
    }
    startTransition(async () => {
      const result = await deleteTransactionAction(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setTransactions((prev) => prev.filter((t) => t._id !== id));
    });
  }

  function handleEdit(item: TransactionItem) {
    setError(undefined);
    const newDescription = prompt("Nova descrição", item.description);
    if (newDescription === null) {
      return;
    }
    const newAmountStr = prompt("Novo valor (R$)", centsToInput(item.amount));
    if (newAmountStr === null) {
      return;
    }
    startTransition(async () => {
      const result = await updateTransactionAction(item._id, {
        description: newDescription,
        amount: inputToCents(newAmountStr),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setTransactions((prev) =>
        prev.map((t) => (t._id === item._id ? (result.data as TransactionItem) : t))
      );
    });
  }

  function handleMonthChange(value: string) {
    setMonthFilter(value);
    setError(undefined);
    startFilterTransition(async () => {
      const filters = value ? monthToRange(value) : {};
      const result = await listTransactionsAction(filters);
      if (result.error) {
        setError(result.error);
        return;
      }
      setTransactions((result.data as TransactionItem[]) ?? []);
    });
  }

  function handleTogglePaid(item: TransactionItem) {
    setError(undefined);
    startTransition(async () => {
      const result = await setPaidAction(item._id, !item.isPaid);
      if (result.error) {
        setError(result.error);
        return;
      }
      setTransactions((prev) =>
        prev.map((t) => (t._id === item._id ? { ...t, isPaid: !t.isPaid } : t))
      );
    });
  }

  return (
    <div className="flex flex-col gap-8">
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
                    <SelectValue>
                      {(value: TransactionType) => TYPE_LABELS[value] ?? value}
                    </SelectValue>
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
                      {(value: string) => accountNameById.get(value) ?? "Conta"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {type === "TRANSFER" ? (
                <div className="flex flex-col gap-2">
                  <Label>Conta destino</Label>
                  <Select value={toAccountId} onValueChange={(v) => setToAccountId(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Conta destino">
                        {(value: string) => accountNameById.get(value) ?? "Conta destino"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a._id} value={a._id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Label>Categoria</Label>
                  <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Categoria">
                        {(value: string) => categoryNameById.get(value) ?? "Categoria"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="tx-amount">Valor (R$)</Label>
                <Input
                  id="tx-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="1000000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="tx-date">Data</Label>
                <Input
                  id="tx-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="tx-description">Descrição</Label>
                <Input
                  id="tx-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => {
                    if (type === "TRANSFER" || !description.trim()) {
                      return;
                    }
                    startTransition(async () => {
                      const result = await suggestCategoryAction(description);
                      if (result.data) {
                        setCategoryId(result.data);
                      }
                    });
                  }}
                  maxLength={200}
                  required
                />
              </div>
              {type !== "TRANSFER" ? (
                <div className="flex flex-col justify-end gap-2 pb-2">
                  <Label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isPaid}
                      onChange={(e) => setIsPaid(e.target.checked)}
                    />
                    Paga
                  </Label>
                </div>
              ) : null}
            </div>

            <div>
              <Button type="submit" disabled={isPending}>
                Criar
              </Button>
            </div>
            </form>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>

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
          aria-label="Filtrar transações por mês"
        />
        {monthFilter ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isFiltering}
            onClick={() => handleMonthChange("")}
          >
            Limpar filtro
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma transação registrada ainda.</p>
        ) : (
          transactions.map((t) => (
            <div
              key={t._id}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-border/70 bg-card p-3 shadow-card"
            >
              <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                <TypeIcon type={t.type} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.date).toLocaleDateString("pt-BR")} ·{" "}
                    {accountNameById.get(t.accountId) ?? "?"}
                    {t.toAccountId ? ` → ${accountNameById.get(t.toAccountId) ?? "?"}` : ""}
                  </p>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    t.type === "EXPENSE" ? "text-expense" : "text-income"
                  }`}
                >
                  {t.type === "EXPENSE" ? "-" : "+"}
                  {formatCurrency(t.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => handleTogglePaid(t)}
                  className={`rounded-full border px-2 py-0.5 text-xs ${
                    t.isPaid
                      ? "border-income text-income"
                      : "border-muted-foreground text-muted-foreground"
                  }`}
                >
                  {t.isPaid ? "Paga" : "Pendente"}
                </button>
                <button
                  type="button"
                  onClick={() => handleEdit(t)}
                  className="rounded px-1 text-xs text-muted-foreground hover:text-foreground"
                  aria-label="Editar transação"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(t._id)}
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                  aria-label="Excluir transação"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TransactionList;

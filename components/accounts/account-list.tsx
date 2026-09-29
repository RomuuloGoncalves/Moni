"use client";

import { useState, useTransition } from "react";
import {
  createAccountAction,
  deleteAccountAction,
  updateAccountAction,
} from "@/app/(dashboard)/accounts/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { InvestmentWarningBadge } from "@/components/accounts/investment-warning-badge";
import { useHideValues } from "@/lib/hooks/use-hide-values";

const ACCOUNT_TYPES = ["CHECKING", "CREDIT", "SAVINGS", "CASH", "INVESTMENT"] as const;
type AccountType = (typeof ACCOUNT_TYPES)[number];

interface AccountItem {
  _id: string;
  name: string;
  type: AccountType;
  balance: number;
}

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function AccountList({ initialAccounts }: { initialAccounts: AccountItem[] }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const { hidden } = useHideValues();
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("CHECKING");
  const [balance, setBalance] = useState("0");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AccountItem | null>(null);

  function resetForm() {
    setName("");
    setType("CHECKING");
    setBalance("0");
    setEditingId(null);
    setOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      if (editingId) {
        const result = await updateAccountAction(editingId, { name, type });
        if (result.error) {
          setError(result.error);
          return;
        }
        setAccounts((prev) =>
          prev.map((a) => (a._id === editingId ? { ...a, name, type } : a))
        );
      } else {
        const balanceCents = Math.round(Number(balance.replace(",", ".")) * 100) || 0;
        const result = await createAccountAction({ name, type, balance: balanceCents });
        if (result.error) {
          setError(result.error);
          return;
        }
        setAccounts((prev) => [...prev, result.data as AccountItem]);
      }
      resetForm();
    });
  }

  function handleEdit(account: AccountItem) {
    setEditingId(account._id);
    setName(account.name);
    setType(account.type);
    setOpen(true);
  }

  function handleDelete(id: string) {
    setError(undefined);
    startTransition(async () => {
      const result = await deleteAccountAction(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setAccounts((prev) => prev.filter((a) => a._id !== id));
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contas</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas contas correntes, cartões, poupanças e dinheiro.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) resetForm();
          }}
        >
          <DialogTrigger
            render={
              <Button size="default" className="shrink-0 gap-1.5" onClick={() => setEditingId(null)}>
                <Plus className="size-4" />
                Nova
              </Button>
            }
          />
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar conta" : "Nova conta"}</DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Altere o nome ou o tipo — o saldo não é afetado."
                  : "Cadastre uma conta corrente, cartão, poupança ou dinheiro."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="account-name">Nome</Label>
              <Input
                id="account-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="account-type">Tipo</Label>
              <select
                id="account-type"
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="h-10 rounded-lg border border-input bg-card px-3 text-sm shadow-xs outline-none transition-colors hover:border-ring/60 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            {!editingId && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="account-balance">Saldo inicial</Label>
                <Input
                  id="account-balance"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  inputMode="decimal"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {editingId ? "Salvar" : "Criar"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
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

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border bg-card p-5 shadow-xl">
            <div>
              <p className="font-semibold">Excluir conta</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tem certeza que deseja excluir <strong>{deleteTarget.name}</strong>? Esta ação não pode ser desfeita.
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setDeleteTarget(null); setError(undefined); }}>
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={isPending}
                onClick={() => {
                  handleDelete(deleteTarget._id);
                  setDeleteTarget(null);
                }}
              >
                <Trash2 className="size-3.5 mr-1.5" />
                {isPending ? "Excluindo…" : "Excluir"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada ainda.</p>
        ) : (
          accounts.map((account) => (
            <Card key={account._id}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="truncate text-base font-medium">{account.name}</p>
                  <p className="text-sm text-muted-foreground">{account.type}</p>
                  {account.type === "INVESTMENT" ? (
                    <div className="mt-1">
                      <InvestmentWarningBadge />
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end sm:gap-4">
                  <p className="text-lg font-semibold tabular-nums">
                    {hidden ? "••••" : formatCents(account.balance)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(account)}>
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteTarget(account)}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default AccountList;

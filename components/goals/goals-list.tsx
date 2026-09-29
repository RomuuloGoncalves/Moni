"use client";

import { useState, useTransition } from "react";
import { Target, Plus, Trash2, PiggyBank, Car, Home, Plane, Smartphone, GraduationCap, Heart } from "lucide-react";
import {
  createGoalAction,
  addContributionAction,
  deleteGoalAction,
  updateGoalAction,
} from "@/app/(dashboard)/goals/actions";

interface Goal {
  _id: string;
  name: string;
  targetCents: number;
  currentCents: number;
  deadline?: string;
  color: string;
  iconType: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  "piggy-bank": PiggyBank,
  "car": Car,
  "home": Home,
  "plane": Plane,
  "phone": Smartphone,
  "education": GraduationCap,
  "health": Heart,
};

const ICON_OPTIONS = [
  { value: "piggy-bank", label: "Cofrinho" },
  { value: "car", label: "Carro" },
  { value: "home", label: "Casa" },
  { value: "plane", label: "Viagem" },
  { value: "phone", label: "Tecnologia" },
  { value: "education", label: "Educação" },
  { value: "health", label: "Saúde" },
];

const PRESET_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ef4444", "#06b6d4", "#84cc16",
];

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDeadline(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC", month: "short", year: "numeric" });
}

function GoalIcon({ type, color }: { type: string; color: string }) {
  const Icon = ICON_MAP[type] ?? PiggyBank;
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full" style={{ background: color + "22" }}>
      <Icon className="size-5" style={{ color }} />
    </div>
  );
}

function ProgressBar({ current, target, color }: { current: number; target: number; color: string }) {
  const pct = Math.min(100, target > 0 ? (current / target) * 100 : 0);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

function ContributeDialog({
  goal,
  onDone,
  onClose,
}: {
  goal: Goal;
  onDone: (newCurrent: number) => void;
  onClose: () => void;
}) {
  const [amountStr, setAmountStr] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountCents = Math.round(parseFloat(amountStr.replace(",", ".")) * 100);
    if (!amountCents || amountCents <= 0) { setError("Valor inválido"); return; }
    setError("");
    startTransition(async () => {
      const res = await addContributionAction(goal._id, amountCents);
      if (res.error) { setError(res.error); return; }
      onDone(goal.currentCents + amountCents);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border bg-card p-5 shadow-xl"
      >
        <h3 className="font-semibold">Adicionar aporte</h3>
        <p className="text-sm text-muted-foreground">{goal.name}</p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Valor (R$)</label>
          <input
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            autoFocus
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: goal.color }}
          >
            {isPending ? "Salvando…" : "Aportar"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface CreateFormProps {
  onDone: (goal: Goal) => void;
  onCancel: () => void;
}

function CreateForm({ onDone, onCancel }: CreateFormProps) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [targetStr, setTargetStr] = useState("");
  const [deadline, setDeadline] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [iconType, setIconType] = useState("piggy-bank");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const targetCents = Math.round(parseFloat(targetStr.replace(",", ".")) * 100);
    if (!targetCents || targetCents <= 0) { setError("Meta inválida"); return; }
    if (!name.trim()) { setError("Nome obrigatório"); return; }
    setError("");
    startTransition(async () => {
      const res = await createGoalAction({
        name: name.trim(), targetCents,
        deadline: deadline || undefined, color, iconType,
      });
      if (res.error) { setError(res.error); return; }
      onDone({
        _id: res.data!._id,
        name: name.trim(), targetCents, currentCents: 0,
        deadline: deadline || undefined, color, iconType,
      });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-4 flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Nova meta</h3>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 col-span-2">
          <label className="text-xs text-muted-foreground">Nome da meta</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Viagem para Europa"
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Valor alvo (R$)</label>
          <input
            value={targetStr}
            onChange={(e) => setTargetStr(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Prazo (opcional)</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Ícone</label>
          <select
            value={iconType}
            onChange={(e) => setIconType(e.target.value)}
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            {ICON_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Cor</label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="size-5 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  background: c,
                  borderColor: color === c ? "white" : "transparent",
                  outline: color === c ? `2px solid ${c}` : "none",
                }}
              />
            ))}
          </div>
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
          {isPending ? "Salvando…" : "Criar meta"}
        </button>
      </div>
    </form>
  );
}

interface GoalCardProps {
  goal: Goal;
  onDelete: (id: string) => void;
  onContribute: (id: string, newCurrent: number) => void;
}

function GoalCard({ goal, onDelete, onContribute }: GoalCardProps) {
  const [isPending, startTransition] = useTransition();
  const [showContribute, setShowContribute] = useState(false);
  const pct = Math.min(100, goal.targetCents > 0 ? (goal.currentCents / goal.targetCents) * 100 : 0);
  const remaining = goal.targetCents - goal.currentCents;

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteGoalAction(goal._id);
      if (!res.error) onDelete(goal._id);
    });
  }

  return (
    <>
      <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <GoalIcon type={goal.iconType} color={goal.color} />
            <div className="min-w-0">
              <p className="font-medium truncate">{goal.name}</p>
              {goal.deadline && (
                <p className="text-xs text-muted-foreground">Prazo: {formatDeadline(goal.deadline)}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>

        <ProgressBar current={goal.currentCents} target={goal.targetCents} color={goal.color} />

        <div className="flex items-center justify-between text-sm">
          <span className="tabular-nums font-semibold" style={{ color: goal.color }}>
            {formatCurrency(goal.currentCents)}
            <span className="text-xs font-normal text-muted-foreground"> / {formatCurrency(goal.targetCents)}</span>
          </span>
          <div className="flex items-center gap-3">
            {remaining > 0 && (
              <span className="text-xs text-muted-foreground">
                faltam {formatCurrency(remaining)} · {pct.toFixed(0)}%
              </span>
            )}
            {pct >= 100 ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Concluída!
              </span>
            ) : (
              <button
                onClick={() => setShowContribute(true)}
                className="rounded-md px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
                style={{ background: goal.color }}
              >
                + Aportar
              </button>
            )}
          </div>
        </div>
      </div>

      {showContribute && (
        <ContributeDialog
          goal={goal}
          onDone={(newCurrent) => {
            onContribute(goal._id, newCurrent);
            setShowContribute(false);
          }}
          onClose={() => setShowContribute(false)}
        />
      )}
    </>
  );
}

interface GoalsListProps {
  initialGoals: Goal[];
}

export function GoalsList({ initialGoals }: GoalsListProps) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [showForm, setShowForm] = useState(false);

  function handleCreated(goal: Goal) {
    setGoals((prev) => [...prev, goal]);
    setShowForm(false);
  }

  function handleDelete(id: string) {
    setGoals((prev) => prev.filter((g) => g._id !== id));
  }

  function handleContribute(id: string, newCurrent: number) {
    setGoals((prev) => prev.map((g) => g._id === id ? { ...g, currentCents: newCurrent } : g));
  }

  const total = goals.length;
  const done = goals.filter((g) => g.currentCents >= g.targetCents).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total === 0 ? "Nenhuma meta" : `${total} meta${total !== 1 ? "s" : ""}`}
          {done > 0 ? ` · ${done} concluída${done !== 1 ? "s" : ""}` : ""}
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-3.5" />
          Nova meta
        </button>
      </div>

      {showForm && (
        <CreateForm onDone={handleCreated} onCancel={() => setShowForm(false)} />
      )}

      {total === 0 && !showForm ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <Target className="size-10 opacity-30" />
          <p className="text-sm">Nenhuma meta de economia criada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal._id}
              goal={goal}
              onDelete={handleDelete}
              onContribute={handleContribute}
            />
          ))}
        </div>
      )}
    </div>
  );
}

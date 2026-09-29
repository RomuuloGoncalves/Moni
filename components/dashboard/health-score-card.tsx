"use client";

import { TrendingUp, Target, AlertCircle, CheckCircle2 } from "lucide-react";

interface HealthScoreProps {
  score: number;
  savingsRate: number;
  goalsActive: number;
  hasOverdue: boolean;
}

function ScoreArc({ score }: { score: number }) {
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ * 0.75; // 75% of circle used for arc
  const color = score >= 70 ? "text-income" : score >= 40 ? "text-amber-500" : "text-expense";

  return (
    <div className={`relative flex size-24 items-center justify-center ${color}`}>
      <svg className="absolute inset-0 -rotate-[135deg]" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${circ * 0.75} ${circ}`} />
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: "stroke-dasharray 0.6s ease" }} />
      </svg>
      <div className="flex flex-col items-center">
        <span className="text-2xl font-bold leading-none">{score}</span>
        <span className="text-[10px] font-medium text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function label(score: number) {
  if (score >= 80) return { text: "Excelente", color: "text-income" };
  if (score >= 60) return { text: "Boa", color: "text-income" };
  if (score >= 40) return { text: "Regular", color: "text-amber-500" };
  return { text: "Atenção", color: "text-expense" };
}

export function HealthScoreCard({ score, savingsRate, goalsActive, hasOverdue }: HealthScoreProps) {
  const { text, color } = label(score);

  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="mb-4 text-base font-semibold">Saúde Financeira</h2>
      <div className="flex items-center gap-6">
        <ScoreArc score={score} />
        <div className="flex flex-col gap-2.5">
          <p className={`text-sm font-semibold ${color}`}>{text}</p>
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Taxa de poupança:</span>
              <span className={`font-semibold ${savingsRate >= 10 ? "text-income" : "text-expense"}`}>
                {savingsRate}%
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Target className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Metas ativas:</span>
              <span className="font-semibold">{goalsActive}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {hasOverdue
                ? <AlertCircle className="size-3.5 text-expense" />
                : <CheckCircle2 className="size-3.5 text-income" />}
              <span className="text-muted-foreground">
                {hasOverdue ? "Há lançamentos vencidos" : "Sem lançamentos vencidos"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

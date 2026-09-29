"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface ProjectionPoint {
  date: string;
  balance: number;
}

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateLabel(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="rounded-lg border bg-card p-3 shadow-md text-sm">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <p className={`font-semibold tabular-nums ${val < 0 ? "text-expense" : "text-income"}`}>
        {formatCurrency(val)}
      </p>
    </div>
  );
}

export function BalanceProjectionChart({ data }: { data: ProjectionPoint[] }) {
  if (data.length < 2) return null;

  const hasVariation = data.some((d) => d.balance !== data[0].balance);
  if (!hasVariation) return null;

  const minVal = Math.min(...data.map((d) => d.balance));
  const maxVal = Math.max(...data.map((d) => d.balance));
  const hasNegative = minVal < 0;

  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="mb-1 text-base font-semibold">Projeção de Saldo</h2>
      <p className="mb-4 text-xs text-muted-foreground">Estimativa para os próximos 90 dias com base nas recorrentes ativas.</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => `R$${(v / 100).toLocaleString("pt-BR", { notation: "compact" })}`}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={64}
            domain={[Math.min(0, minVal * 1.1), maxVal * 1.05]}
          />
          <Tooltip content={<CustomTooltip />} />
          {hasNegative && (
            <ReferenceLine y={0} stroke="var(--expense)" strokeDasharray="4 4" strokeWidth={1} />
          )}
          <Line
            type="monotone"
            dataKey="balance"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ConsolidatedBalanceCard({ balanceCents }: { balanceCents: number }) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <p className="text-sm text-muted-foreground">Saldo consolidado</p>
      <p
        className={`mt-2 text-4xl font-semibold tracking-tight tabular-nums ${
          balanceCents < 0 ? "text-expense" : "text-primary"
        }`}
      >
        {formatCurrency(balanceCents)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Soma do saldo de todas as suas contas</p>
    </div>
  );
}

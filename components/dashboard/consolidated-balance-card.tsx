function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ConsolidatedBalanceCard({ 
  balanceCents, 
  availableBalanceCents 
}: { 
  balanceCents: number;
  availableBalanceCents: number;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
      <div>
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
      <div className="sm:text-right border-l-2 sm:border-l-0 sm:border-r-0 border-primary/20 pl-4 sm:pl-0 sm:pr-4">
        <p className="text-sm text-muted-foreground">Disponível para uso</p>
        <p
          className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${
            availableBalanceCents < 0 ? "text-expense" : ""
          }`}
        >
          {formatCurrency(availableBalanceCents)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Contas correntes e dinheiro</p>
      </div>
    </div>
  );
}

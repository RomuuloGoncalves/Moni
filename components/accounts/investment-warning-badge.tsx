import { TriangleAlert } from "lucide-react";

/**
 * Warning shown wherever an INVESTMENT account's balance is displayed
 * (ACC-03 AC2): the balance is only the amount deposited, never a live
 * market valuation.
 */
export function InvestmentWarningBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
      title="Saldo pode não refletir a valorização real do mercado — atualize manualmente se necessário"
    >
      <TriangleAlert className="size-3" aria-hidden="true" />
      Só valor aportado
    </span>
  );
}

export default InvestmentWarningBadge;

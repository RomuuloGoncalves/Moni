import { listTransactionsAction } from "./actions";
import { listAccountsAction } from "@/app/(dashboard)/accounts/actions";
import { listCategoriesAction } from "@/app/(dashboard)/categories/actions";
import { TransactionList } from "@/components/transactions/transaction-list";

function currentMonthRange() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return {
    monthStr: `${year}-${String(month + 1).padStart(2, "0")}`,
    from: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)),
    to: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)),
  };
}

export default async function TransactionsPage() {
  const { monthStr, from, to } = currentMonthRange();
  const [transactionsResult, accountsResult, categoriesResult] = await Promise.all([
    listTransactionsAction({ from, to }),
    listAccountsAction(),
    listCategoriesAction(),
  ]);

  const transactions = (transactionsResult.data ?? []) as Record<string, unknown>[];
  const accounts = (accountsResult.data ?? []) as { _id: string; name: string }[];
  const categories = (categoriesResult.data ?? []) as {
    _id: string;
    name: string;
    color: string;
    iconType: string;
  }[];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <TransactionList
        initialTransactions={transactions.map((t) => ({
          ...t,
          _id: String(t._id),
          accountId: String(t.accountId),
          toAccountId: t.toAccountId ? String(t.toAccountId) : undefined,
          categoryId: t.categoryId ? String(t.categoryId) : undefined,
          date: new Date(t.date as string).toISOString(),
        })) as never}
        accounts={accounts.map((a) => ({ ...a, _id: String(a._id) }))}
        categories={categories.map((c) => ({ ...c, _id: String(c._id) }))}
        initialMonth={monthStr}
      />
    </main>
  );
}

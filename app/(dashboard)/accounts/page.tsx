import { listAccountsAction } from "./actions";
import { AccountList } from "@/components/accounts/account-list";

export default async function AccountsPage() {
  const result = await listAccountsAction();
  const accounts = (result.data ?? []) as {
    _id: string;
    name: string;
    type: "CHECKING" | "CREDIT" | "SAVINGS" | "CASH" | "INVESTMENT";
    balance: number;
  }[];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <AccountList
        initialAccounts={accounts.map((a) => ({ ...a, _id: String(a._id) }))}
      />
    </main>
  );
}

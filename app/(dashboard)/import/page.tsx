import { listAccountsAction } from "../accounts/actions";
import { ImportForm } from "@/components/import/import-form";

export default async function ImportPage() {
  const result = await listAccountsAction();
  const accounts = ((result.data ?? []) as { _id: string; name: string }[]).map((a) => ({
    _id: String(a._id),
    name: a.name,
  }));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importar extrato</h1>
        <p className="text-sm text-muted-foreground">
          Importe um arquivo OFX ou CSV do seu banco para lançar transações automaticamente.
        </p>
      </div>
      <ImportForm accounts={accounts} />
    </main>
  );
}

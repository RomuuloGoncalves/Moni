"use client";

import { useState, useTransition } from "react";
import { importFileAction } from "@/app/(dashboard)/import/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload } from "lucide-react";

interface AccountOption {
  _id: string;
  name: string;
}

const CSV_FIELDS = [
  { key: "date", label: "Coluna de data" },
  { key: "amount", label: "Coluna de valor" },
  { key: "description", label: "Coluna de descrição/tipo" },
  { key: "counterparty", label: "Coluna de origem/destino (opcional)" },
] as const;

const DEFAULT_MAPPING: Record<(typeof CSV_FIELDS)[number]["key"], string> = {
  date: "data",
  amount: "valor",
  description: "tipo",
  counterparty: "origem / destino",
};

export function ImportForm({ accounts }: { accounts: AccountOption[] }) {
  const [accountId, setAccountId] = useState(accounts[0]?._id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState(DEFAULT_MAPPING);
  const [error, setError] = useState<string | undefined>();
  const [summary, setSummary] = useState<{ imported: number; skipped: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  const isCsv = file?.name.toLowerCase().endsWith(".csv") ?? false;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setSummary(null);
    if (!file || !accountId) {
      setError("selecione uma conta e um arquivo");
      return;
    }
    startTransition(async () => {
      const result = await importFileAction({
        accountId,
        file,
        columnMapping: isCsv
          ? {
              date: mapping.date,
              amount: mapping.amount,
              description: mapping.description,
              counterparty: mapping.counterparty || undefined,
              rawType: mapping.description,
            }
          : undefined,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSummary(result.data ?? null);
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="import-account">Conta</Label>
            <select
              id="import-account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="h-10 rounded-lg border border-input bg-card px-3 text-sm shadow-xs outline-none transition-colors hover:border-ring/60 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20"
            >
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="import-file">Arquivo (.ofx ou .csv, até 5MB)</Label>
            <Input
              id="import-file"
              type="file"
              accept=".ofx,.csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>

          {isCsv ? (
            <div className="flex flex-col gap-3 rounded-lg border border-border/60 p-3">
              <p className="text-sm font-medium">Mapeamento de colunas do CSV</p>
              {CSV_FIELDS.map((field) => (
                <div key={field.key} className="flex flex-col gap-1">
                  <Label htmlFor={`mapping-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`mapping-${field.key}`}
                    value={mapping[field.key]}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          ) : null}

          <Button type="submit" disabled={isPending} className="gap-1.5 self-start">
            <Upload className="size-4" />
            Importar
          </Button>
        </form>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {summary ? (
          <p className="text-sm">
            <strong>{summary.imported}</strong> transações importadas,{" "}
            <strong>{summary.skipped}</strong> duplicadas puladas.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default ImportForm;

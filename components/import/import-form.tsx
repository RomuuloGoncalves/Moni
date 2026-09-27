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

export interface FileProgress {
  status: "pending" | "importing" | "success" | "error";
  error?: string;
  summary?: { imported: number; skipped: number };
}

export function ImportForm({ accounts }: { accounts: AccountOption[] }) {
  const [accountId, setAccountId] = useState(accounts[0]?._id ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [fileStatuses, setFileStatuses] = useState<Record<string, FileProgress>>({});
  const [mapping, setMapping] = useState(DEFAULT_MAPPING);
  const [isPending, startTransition] = useTransition();

  const hasCsv = files.some((f) => f.name.toLowerCase().endsWith(".csv"));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0 || !accountId) return;

    // Reset statuses to pending for all selected files
    const initialStatuses: Record<string, FileProgress> = {};
    for (const f of files) {
      initialStatuses[f.name] = { status: "pending" };
    }
    setFileStatuses(initialStatuses);

    startTransition(async () => {
      for (const f of files) {
        // Mark as importing
        setFileStatuses((prev) => ({
          ...prev,
          [f.name]: { status: "importing" },
        }));

        const isThisCsv = f.name.toLowerCase().endsWith(".csv");
        
        try {
          const result = await importFileAction({
            accountId,
            file: f,
            columnMapping: isThisCsv
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
            setFileStatuses((prev) => ({
              ...prev,
              [f.name]: { status: "error", error: result.error },
            }));
          } else {
            setFileStatuses((prev) => ({
              ...prev,
              [f.name]: { status: "success", summary: result.data ?? { imported: 0, skipped: 0 } },
            }));
          }
        } catch (err) {
          setFileStatuses((prev) => ({
            ...prev,
            [f.name]: { status: "error", error: "Erro desconhecido ao importar" },
          }));
        }
      }
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
            <Label htmlFor="import-file">Arquivo (.ofx, .csv ou .pdf, até 5MB)</Label>
            <Input
              id="import-file"
              type="file"
              accept=".ofx,.csv,.pdf"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              required
            />
          </div>

          {hasCsv ? (
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

        {files.length > 0 && Object.keys(fileStatuses).length > 0 ? (
          <div className="mt-4 flex flex-col gap-3">
            <h3 className="text-sm font-medium">Progresso da Importação</h3>
            <div className="flex flex-col gap-2">
              {files.map((f) => {
                const statusInfo = fileStatuses[f.name];
                if (!statusInfo) return null;

                return (
                  <div key={f.name} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <span className="font-medium truncate max-w-[50%]">{f.name}</span>
                    <div className="flex items-center gap-2">
                      {statusInfo.status === "pending" && <span className="text-muted-foreground">Aguardando...</span>}
                      {statusInfo.status === "importing" && <span className="text-blue-500 font-medium animate-pulse">Importando...</span>}
                      {statusInfo.status === "error" && <span className="text-destructive max-w-xs truncate" title={statusInfo.error}>{statusInfo.error}</span>}
                      {statusInfo.status === "success" && (
                        <span className="text-green-600">
                          {statusInfo.summary?.imported} importadas, {statusInfo.summary?.skipped} duplicadas
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default ImportForm;

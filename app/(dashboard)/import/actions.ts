"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { importService, type ImportResult } from "@/services/import.service";
import { parseOfx } from "@/lib/parsers/ofx";
import { parseCsv, type CsvColumnMapping } from "@/lib/parsers/csv";
import { InvalidImportFileError } from "@/lib/parsers/types";
import { toPlainObject } from "@/lib/serialize";

interface ActionResult<T> {
  data?: T;
  error?: string;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB, IMP-01 AC7

class UnauthenticatedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthenticatedError";
  }
}

async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    throw new UnauthenticatedError();
  }
  return userId;
}

export interface ImportFileActionInput {
  accountId: string;
  file: File;
  /** Required only when the file is a CSV; ignored for OFX. */
  columnMapping?: CsvColumnMapping;
}

export async function importFileAction(
  input: ImportFileActionInput
): Promise<ActionResult<ImportResult>> {
  try {
    const userId = await requireUserId();

    if (input.file.size > MAX_FILE_SIZE_BYTES) {
      return { error: "arquivo excede o tamanho máximo de 5MB" };
    }

    const buffer = Buffer.from(await input.file.arrayBuffer());
    const isCsv = input.file.name.toLowerCase().endsWith(".csv");

    const parsed = isCsv
      ? parseCsv(buffer, requireColumnMapping(input.columnMapping))
      : parseOfx(buffer);

    const result = await importService.importTransactions(userId, input.accountId, parsed);
    return { data: toPlainObject(result) };
  } catch (err) {
    return { error: mapError(err) };
  }
}

function requireColumnMapping(mapping: CsvColumnMapping | undefined): CsvColumnMapping {
  if (!mapping) {
    throw new InvalidImportFileError("Mapeamento de colunas é obrigatório para CSV");
  }
  return mapping;
}

function mapError(err: unknown): string {
  if (err instanceof UnauthenticatedError) {
    return "não autenticado";
  }
  if (err instanceof InvalidImportFileError) {
    return err.message;
  }
  throw err;
}

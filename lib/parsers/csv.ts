import Papa from "papaparse";
import { InvalidImportFileError, type ParsedTransaction } from "@/lib/parsers/types";

/** Maps a CSV's own header names to the fields this parser understands. */
export interface CsvColumnMapping {
  date: string;
  amount: string;
  description: string;
  /** Optional second description-ish column, concatenated onto `description` (e.g. PicPay's "origem / destino"). */
  counterparty?: string;
  rawType?: string;
}

const UNICODE_MINUS = "−"; // U+2212 MINUS SIGN
const BRAZILIAN_CURRENCY_PATTERN = new RegExp(`^[+\\-${UNICODE_MINUS}]?\\s*R\\$`);

/** Detects whether a raw value column looks like the Brazilian currency format. */
function looksBrazilian(value: string): boolean {
  return BRAZILIAN_CURRENCY_PATTERN.test(value.trim());
}

/**
 * Normalizes a Brazilian-format currency string (`R$` prefix, `.` thousands
 * separator, `,` decimal separator, sign as ASCII `+`/`-` or Unicode MINUS
 * SIGN `−`) to a signed integer of cents.
 */
export function parseBrazilianCurrencyToCents(value: string): number {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new InvalidImportFileError("Empty currency value");
  }

  let sign = 1;
  let rest = trimmed;
  const firstChar = rest.charAt(0);
  if (firstChar === UNICODE_MINUS || firstChar === "-") {
    sign = -1;
    rest = rest.slice(1);
  } else if (firstChar === "+") {
    sign = 1;
    rest = rest.slice(1);
  }

  rest = rest.trim().replace(/^R\$/, "").trim();
  rest = rest.replace(/\./g, "").replace(",", ".");

  const numeric = Number(rest);
  if (Number.isNaN(numeric)) {
    throw new InvalidImportFileError(`Invalid Brazilian currency value: "${value}"`);
  }

  return sign * Math.round(numeric * 100);
}

/** Generic numeric parse fallback for non-Brazilian-formatted value columns. */
function parseGenericAmountToCents(value: string): number {
  const trimmed = value.trim();
  const numeric = Number(trimmed.replace(",", "."));
  if (Number.isNaN(numeric)) {
    throw new InvalidImportFileError(`Invalid amount value: "${value}"`);
  }
  return Math.round(numeric * 100);
}

/**
 * Parses a CSV file buffer into a list of transactions using `columnMapping`
 * to locate the date/amount/description columns. Applies
 * `parseBrazilianCurrencyToCents` when the mapped value column looks like
 * that format, and falls back to a generic numeric parse otherwise.
 * Throws `InvalidImportFileError` on malformed input (IMP-01 AC4).
 */
export function parseCsv(
  fileBuffer: Buffer | string,
  columnMapping: CsvColumnMapping
): ParsedTransaction[] {
  const content = typeof fileBuffer === "string" ? fileBuffer : fileBuffer.toString("utf-8");

  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0 && (!result.data || result.data.length === 0)) {
    throw new InvalidImportFileError("Could not parse CSV file");
  }

  if (!result.data || result.data.length === 0) {
    throw new InvalidImportFileError("CSV file has no data rows");
  }

  return result.data.map((row) => {
    const rawDate = row[columnMapping.date];
    const rawAmount = row[columnMapping.amount];
    const rawDescription = row[columnMapping.description] ?? "";

    if (!rawDate || rawAmount === undefined || rawAmount === null || rawAmount === "") {
      throw new InvalidImportFileError("CSV row missing required date/amount column");
    }

    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) {
      throw new InvalidImportFileError(`Invalid date value: "${rawDate}"`);
    }

    const amountCents = looksBrazilian(rawAmount)
      ? parseBrazilianCurrencyToCents(rawAmount)
      : parseGenericAmountToCents(rawAmount);

    const counterparty = columnMapping.counterparty
      ? (row[columnMapping.counterparty] ?? "").trim() || undefined
      : undefined;
    const rawType = columnMapping.rawType
      ? (row[columnMapping.rawType] ?? "").trim() || undefined
      : undefined;

    const description = [rawDescription.trim(), counterparty]
      .filter((part): part is string => Boolean(part))
      .join(" - ");

    return {
      date,
      amountCents,
      description: description || "Transação importada",
      counterparty,
      rawType,
    };
  });
}

export default parseCsv;

import { parseStrict } from "ofx-js";
import { InvalidImportFileError, type ParsedTransaction } from "@/lib/parsers/types";

interface RawStatementTransaction {
  DTPOSTED: string;
  TRNAMT: string;
  NAME?: string;
  MEMO?: string;
}

/** Parses `OFXDateTime` (e.g. "20260115120000[-3:BRT]" or "20260115") into a Date. */
function parseOfxDate(raw: string): Date {
  const digits = raw.slice(0, 8);
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) {
    throw new InvalidImportFileError("Invalid date in OFX transaction");
  }
  return date;
}

function toDescription(tx: RawStatementTransaction): string {
  const description = [tx.NAME, tx.MEMO].filter(Boolean).join(" - ").trim();
  return description || "Transação importada";
}

function toAmountCents(raw: string): number {
  const value = Number(raw);
  if (Number.isNaN(value)) {
    throw new InvalidImportFileError("Invalid amount in OFX transaction");
  }
  return Math.round(value * 100);
}

/**
 * Parses an OFX file buffer into a list of transactions. Throws
 * `InvalidImportFileError` on any malformed/unparseable input — nothing is
 * partially imported (IMP-01 AC4).
 */
export function parseOfx(fileBuffer: Buffer | string): ParsedTransaction[] {
  const content = typeof fileBuffer === "string" ? fileBuffer : fileBuffer.toString("utf-8");

  let parsed;
  try {
    parsed = parseStrict(content);
  } catch {
    throw new InvalidImportFileError("Could not parse OFX file");
  }

  const stmttrnrs = parsed?.OFX?.BANKMSGSRSV1?.STMTTRNRS;
  const stmttrnrsSingle = Array.isArray(stmttrnrs) ? stmttrnrs[0] : stmttrnrs;
  const stmtrs = stmttrnrsSingle?.STMTRS;
  const list = stmtrs?.BANKTRANLIST?.STMTTRN;

  if (!list) {
    throw new InvalidImportFileError("OFX file does not contain any bank transactions");
  }

  const rawTransactions: RawStatementTransaction[] = Array.isArray(list) ? list : [list];

  return rawTransactions.map((tx) => {
    if (!tx.DTPOSTED || tx.TRNAMT === undefined) {
      throw new InvalidImportFileError("OFX transaction missing date or amount");
    }
    return {
      date: parseOfxDate(tx.DTPOSTED),
      amountCents: toAmountCents(tx.TRNAMT),
      description: toDescription(tx),
    };
  });
}

export default parseOfx;

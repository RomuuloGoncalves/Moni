/** Common shape produced by every import parser (OFX and CSV). */
export interface ParsedTransaction {
  date: Date;
  /** Signed integer cents; positive = credit/INCOME, negative = debit/EXPENSE. */
  amountCents: number;
  description: string;
  /** Raw origin/destination field, when the source format has one (e.g. PicPay CSV). */
  counterparty?: string;
  /** Raw free-text type/label field, when the source format has one (e.g. PicPay CSV "tipo"). */
  rawType?: string;
}

export class InvalidImportFileError extends Error {
  constructor(message = "The uploaded file could not be parsed") {
    super(message);
    this.name = "InvalidImportFileError";
  }
}

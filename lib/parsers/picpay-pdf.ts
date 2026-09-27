import { PDFParse } from "pdf-parse";
import { ParsedTransaction, InvalidImportFileError } from "./types";

export async function parsePicPayPdf(buffer: Buffer): Promise<ParsedTransaction[]> {
  try {
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    const text = data.text;

    // Match DD/MM/YYYY | DD/MM/YYYY or DD-MM-YYYY | ... DD-MM-YYYY (Vencimento | Fechamento)
    const datesMatch = text.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})\s*\|.*?(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (!datesMatch) {
      throw new InvalidImportFileError(
        "Não foi possível encontrar a data de vencimento na fatura."
      );
    }
    
    // index 3 is Vencimento year, index 2 is Vencimento month
    const invoiceYear = parseInt(datesMatch[3], 10);
    const invoiceMonth = parseInt(datesMatch[2], 10);

    const transactions: ParsedTransaction[] = [];
    const lines = text.split("\n");

    // Match DD/MM <Description> <Amount>
    const txRegex = /^(\d{2})\/(\d{2})\s+(.+?)\s+(-?(?:\d+\.)?\d+,\d{2})$/;

    for (const line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(txRegex);
      if (match) {
        const [_, dayStr, monthStr, desc, amountStr] = match;

        // Skip pagamentos de fatura to avoid duplicates with checking account
        if (desc.toUpperCase().includes("PAGAMENTO DE FATURA")) {
          continue;
        }

        const day = parseInt(dayStr, 10);
        const month = parseInt(monthStr, 10);

        let txYear = invoiceYear;
        // Handle year wrap-around (e.g. invoice in Jan 2026, tx in Dec 2025)
        if (month > invoiceMonth + 1) {
          txYear = invoiceYear - 1;
        }

        // Set to UTC noon to avoid timezone issues
        const date = new Date(Date.UTC(txYear, month - 1, day, 12, 0, 0));

        const cleanAmount = amountStr.replace(/\./g, "").replace(",", ".");
        let amountCents = Math.round(parseFloat(cleanAmount) * 100);

        // Positive in PDF = expense (debit to user), negative = credit/payment
        // System expects amountCents < 0 for expense, > 0 for income
        amountCents = -amountCents;

        transactions.push({
          date,
          amountCents,
          description: desc.trim(),
          rawType: "Cartão de Crédito",
        });
      }
    }

    return transactions;
  } catch (err) {
    console.error("PDF Parse error:", err);
    if (err instanceof InvalidImportFileError) {
      throw err;
    }
    throw new InvalidImportFileError("Erro ao ler o PDF da fatura.");
  }
}

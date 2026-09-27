import { describe, expect, it, vi, beforeEach } from "vitest";
import { parsePicPayPdf } from "./picpay-pdf";
import { PDFParse } from "pdf-parse";
import { InvalidImportFileError } from "./types";

const mockGetText = vi.fn();

vi.mock("pdf-parse", () => {
  return {
    PDFParse: vi.fn().mockImplementation(function() {
      return {
        getText: mockGetText,
      };
    }),
  };
});

describe("parsePicPayPdf", () => {
  beforeEach(() => {
    mockGetText.mockReset();
  });

  it("extracts transactions correctly and infers year", async () => {
    const fakeText = `
ROMULO DA SILVA GONCALVES, MARIA PEREIRA DA SILVA NUNES, 000267, DONATO FLORES, CASA, 18275768 TATUI - SP 10/09/2026 | 03/09/2026 Vencimento: Fechamen
PicPay Mastercard® GOLD
Picpay Card
Transações Nacionais
Data Estabelecimento Valor (R$)
04/08 PAGAMENTO DE FATURA -50,00
04/08 CURSOR, AI POWERED IDE 105,84
07/08 SKYFIT SOROCABA 99,90
30/12 ASSINATURA DEZEMBRO 20,00
Subtotal dos lançamentos 128,71
    `;
    
    mockGetText.mockResolvedValueOnce({ text: fakeText });

    const buffer = Buffer.from("fake-pdf");
    const result = await parsePicPayPdf(buffer);

    // It should skip "PAGAMENTO DE FATURA" and "Subtotal"
    expect(result).toHaveLength(3);

    // First transaction (Aug 2026)
    expect(result[0].description).toBe("CURSOR, AI POWERED IDE");
    expect(result[0].amountCents).toBe(-10584);
    expect(result[0].date.toISOString()).toContain("2026-08-04T12:00:00");
    expect(result[0].rawType).toBe("Cartão de Crédito");

    // Second transaction (Aug 2026)
    expect(result[1].description).toBe("SKYFIT SOROCABA");
    expect(result[1].amountCents).toBe(-9990);
    expect(result[1].date.toISOString()).toContain("2026-08-07T12:00:00");

    // Third transaction (Dec 2025 - previous year because month 12 > month 09 + 1)
    expect(result[2].description).toBe("ASSINATURA DEZEMBRO");
    expect(result[2].amountCents).toBe(-2000);
    expect(result[2].date.toISOString()).toContain("2025-12-30T12:00:00");
  });

  it("extracts transactions correctly with hyphenated dates", async () => {
    const fakeText = `
ROMULO DA SILVA GONCALVES,
Vencimento: 10-01-2026 | Fechamento: 05-01-2026
PicPay Mastercard® GOLD
Picpay Card
Transações Nacionais
Data Estabelecimento Valor (R$)
04/01 COMPRA DE ANO NOVO 100,00
Subtotal dos lançamentos 100,00
    `;
    
    mockGetText.mockResolvedValueOnce({ text: fakeText });

    const buffer = Buffer.from("fake-pdf");
    const result = await parsePicPayPdf(buffer);

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("COMPRA DE ANO NOVO");
    expect(result[0].amountCents).toBe(-10000);
    // Vencimento in Jan 2026, Tx in Jan, so Tx Year should be 2026
    expect(result[0].date.toISOString()).toContain("2026-01-04T12:00:00");
  });

  it("throws InvalidImportFileError if no vencimento is found", async () => {
    mockGetText.mockResolvedValueOnce({ text: "Texto sem data de vencimento." });
    
    const buffer = Buffer.from("fake-pdf");
    await expect(parsePicPayPdf(buffer)).rejects.toThrow(InvalidImportFileError);
  });
});

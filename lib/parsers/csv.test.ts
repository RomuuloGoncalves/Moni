import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseCsv, parseBrazilianCurrencyToCents } from "@/lib/parsers/csv";
import { InvalidImportFileError } from "@/lib/parsers/types";

const PICPAY_MAPPING = {
  date: "data",
  amount: "valor",
  description: "tipo",
  counterparty: "origem / destino",
  rawType: "forma de pagamento",
};

const PICPAY_FIXTURE_PATH = path.resolve(
  process.cwd(),
  "test-fixtures/csv-imports/picpay-sample.csv"
);

describe("parseBrazilianCurrencyToCents", () => {
  it("parses a positive value with thousands separator and ASCII plus sign", () => {
    expect(parseBrazilianCurrencyToCents("+R$ 1.234,56")).toBe(123456);
  });

  it("parses a negative value using the Unicode MINUS SIGN (U+2212)", () => {
    expect(parseBrazilianCurrencyToCents("−R$ 16,00")).toBe(-1600);
  });

  it("parses a negative value using the ASCII hyphen for robustness", () => {
    expect(parseBrazilianCurrencyToCents("-R$ 16,00")).toBe(-1600);
  });

  it("throws InvalidImportFileError on unparseable currency text", () => {
    expect(() => parseBrazilianCurrencyToCents("garbage")).toThrow(InvalidImportFileError);
  });
});

describe("parseCsv - generic column mapping", () => {
  it("applies a generic column mapping and numeric amount", () => {
    const csv = "date,amount,desc\n2026-01-10,-30.5,Mercado\n2026-01-15,100,Salario\n";
    const result = parseCsv(csv, { date: "date", amount: "amount", description: "desc" });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ amountCents: -3050, description: "Mercado" });
    expect(result[1]).toMatchObject({ amountCents: 10000, description: "Salario" });
  });

  it("throws InvalidImportFileError on malformed input", () => {
    expect(() =>
      parseCsv("", { date: "date", amount: "amount", description: "desc" })
    ).toThrow(InvalidImportFileError);
  });

  it("throws InvalidImportFileError when a required column is missing on a row", () => {
    const csv = "date,amount,desc\n,100,Salario\n";
    expect(() =>
      parseCsv(csv, { date: "date", amount: "amount", description: "desc" })
    ).toThrow(InvalidImportFileError);
  });
});

describe("parseCsv - PicPay real-world fixture", () => {
  const fixture = readFileSync(PICPAY_FIXTURE_PATH);

  it("parses the Brazilian currency format (thousands separator, decimal comma, Unicode minus) from the real fixture", () => {
    const result = parseCsv(fixture, PICPAY_MAPPING);
    expect(result.length).toBeGreaterThan(0);

    const debit = result.find((r) => r.description.includes("Fatura PicPay Card"));
    expect(debit).toBeDefined();
    expect(debit!.amountCents).toBeLessThan(0);

    const credit = result.find((r) => r.description.includes("Pix recebido"));
    expect(credit).toBeDefined();
    expect(credit!.amountCents).toBeGreaterThan(0);
  });

  it("composes description as 'tipo - origem/destino', matching the manually-seeded description format", () => {
    const result = parseCsv(fixture, PICPAY_MAPPING);
    const pix = result.find((r) =>
      r.description.startsWith("Pix enviado - EUNICE ANANIAS DA SILVA GONCALVES")
    );
    expect(pix).toBeDefined();
  });

  it("does not break on rows with an empty optional field ('forma de pagamento' blank)", () => {
    const result = parseCsv(fixture, PICPAY_MAPPING);
    const withoutPaymentForm = result.find((r) => r.rawType === undefined);
    expect(withoutPaymentForm).toBeDefined();
  });

  it("uses only the date column, discarding a separate hora column", () => {
    const result = parseCsv(fixture, PICPAY_MAPPING);
    for (const row of result) {
      expect(row.date.getUTCHours()).toBe(0);
    }
  });
});

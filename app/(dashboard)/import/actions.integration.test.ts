import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetServerSession = vi.fn();
vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

import { importFileAction } from "./actions";
import { createAccountAction } from "../accounts/actions";
import { listTransactionsAction } from "../transactions/actions";

function mockSession(userId: string | null) {
  mockGetServerSession.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

function csvFile(content: string, name = "extrato.csv"): File {
  return new File([content], name, { type: "text/csv" });
}

const CSV_MAPPING = {
  date: "data",
  amount: "valor",
  description: "tipo",
  counterparty: "origem / destino",
  rawType: "tipo",
};

describe("importFileAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated calls", async () => {
    mockSession(null);
    const result = await importFileAction({
      accountId: "507f1f77bcf86cd799439011",
      file: csvFile("a,b\n1,2\n"),
    });
    expect(result.error).toBe("não autenticado");
  });

  it("rejects a file larger than 5MB before parsing (IMP-01 AC7)", async () => {
    mockSession("507f1f77bcf86cd799439021");
    const bigContent = "a".repeat(6 * 1024 * 1024);
    const result = await importFileAction({
      accountId: "507f1f77bcf86cd799439011",
      file: csvFile(bigContent),
      columnMapping: CSV_MAPPING,
    });
    expect(result.error).toMatch(/5MB/);
  });

  it("imports a CSV with duplicates, and cofrinho/investment routing, end-to-end", async () => {
    mockSession("507f1f77bcf86cd799439022");

    const account = await createAccountAction({
      name: "PicPay",
      type: "CHECKING",
      balance: 0,
    });
    const accountId = String((account.data as { _id: unknown })._id);

    const csv = [
      'data,hora,tipo,"origem / destino",valor,"forma de pagamento"',
      '2026-01-10,10:00,"Compra realizada","Mercado X","−R$ 20,00","Com saldo"',
      '2026-01-11,10:00,"Dinheiro guardado","No cofrinho Viagem","−R$ 100,00","Com saldo"',
      '2026-01-12,10:00,"Pix enviado","RICO LTDA","−R$ 500,00","Com saldo"',
      '2026-01-13,10:00,"Pix recebido","Fulano","+R$ 300,00",',
    ].join("\n");

    const first = await importFileAction({
      accountId,
      file: csvFile(csv),
      columnMapping: CSV_MAPPING,
    });
    expect(first.data).toEqual({ imported: 4, skipped: 0 });

    // Re-importing the exact same file should skip all 4 as duplicates.
    const second = await importFileAction({
      accountId,
      file: csvFile(csv),
      columnMapping: CSV_MAPPING,
    });
    expect(second.data).toEqual({ imported: 0, skipped: 4 });

    const transactions = await listTransactionsAction({ accountId });
    const transferRows = (transactions.data as { type: string }[]).filter(
      (t) => t.type === "TRANSFER"
    );
    expect(transferRows).toHaveLength(2);
  });
});

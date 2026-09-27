import { describe, expect, it, vi, beforeEach } from "vitest";

const fakeSession = {
  withTransaction: vi.fn(async (fn: () => Promise<void>) => {
    await fn();
  }),
  endSession: vi.fn(async () => {}),
};

vi.mock("mongoose", async () => {
  const actual = await vi.importActual<typeof import("mongoose")>("mongoose");
  return {
    ...actual,
    default: {
      ...actual.default,
      startSession: vi.fn(async () => fakeSession),
    },
    startSession: vi.fn(async () => fakeSession),
  };
});

vi.mock("@/repositories/account.repository", () => ({
  accountRepository: {
    list: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/repositories/transaction.repository", () => ({
  transactionRepository: {
    list: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/services/account.service", () => ({
  accountService: {
    adjustBalance: vi.fn(),
  },
}));

vi.mock("@/services/merchant-category-rule.service", () => ({
  merchantCategoryRuleService: {
    suggestCategory: vi.fn(),
  },
}));

import { accountRepository } from "@/repositories/account.repository";
import { transactionRepository } from "@/repositories/transaction.repository";
import { accountService } from "@/services/account.service";
import { merchantCategoryRuleService } from "@/services/merchant-category-rule.service";
import {
  classifyPicPayRow,
  resolveOrCreateAccountByName,
  importTransactions,
} from "@/services/import.service";
import type { ParsedTransaction } from "@/lib/parsers/types";

const accRepo = vi.mocked(accountRepository);
const txnRepo = vi.mocked(transactionRepository);
const accSvc = vi.mocked(accountService);
const merchantSvc = vi.mocked(merchantCategoryRuleService);

function row(overrides: Partial<ParsedTransaction>): ParsedTransaction {
  return {
    date: new Date("2026-01-10"),
    amountCents: -1000,
    description: "Compra realizada - Mercado X",
    ...overrides,
  };
}

describe("classifyPicPayRow (IMP-02)", () => {
  it("IMP-02 AC1: 'Dinheiro guardado No cofrinho X' becomes a TRANSFER to a SAVINGS account named X", () => {
    const result = classifyPicPayRow(
      row({
        rawType: "Dinheiro guardado",
        counterparty: "No cofrinho Viagem",
        amountCents: -30000,
      })
    );
    expect(result).toMatchObject({
      type: "TRANSFER",
      targetAccountName: "Viagem",
      targetAccountType: "SAVINGS",
      reversed: false,
    });
  });

  it("IMP-02 AC2: 'Dinheiro resgatado Do cofrinho X' becomes a reversed TRANSFER (cofrinho -> origin)", () => {
    const result = classifyPicPayRow(
      row({
        rawType: "Dinheiro resgatado",
        counterparty: "Do cofrinho Cofrinho do Rô",
        amountCents: 45181,
      })
    );
    expect(result).toMatchObject({
      type: "TRANSFER",
      targetAccountName: "Cofrinho do Rô",
      targetAccountType: "SAVINGS",
      reversed: true,
    });
  });

  it("IMP-02 AC4: 'Pix enviado' to a counterparty containing RICO, XP, or ROMULO DA SILVA GONCALVES (case-insensitive) becomes a TRANSFER to Investimentos", () => {
    const result = classifyPicPayRow(
      row({ rawType: "Pix enviado", counterparty: "rico ltda", amountCents: -50000 })
    );
    expect(result).toMatchObject({
      type: "TRANSFER",
      targetAccountName: "Investimentos",
      targetAccountType: "INVESTMENT",
      reversed: false,
    });

    const user = classifyPicPayRow(
      row({ rawType: "Pix enviado", counterparty: "ROMULO DA SILVA GONCALVES", amountCents: -20000 })
    );
    expect(user).toMatchObject({
      type: "TRANSFER",
      targetAccountName: "Investimentos",
      targetAccountType: "INVESTMENT",
      reversed: false,
    });
  });

  it("IMP-02 AC5: TRANSFER classification result never carries a categoryId field", () => {
    const result = classifyPicPayRow(
      row({ rawType: "Pix enviado", counterparty: "XP Investimentos", amountCents: -1000 })
    );
    expect(result).not.toHaveProperty("categoryId");
  });

  it("IMP-02 AC6: a row not matching any special case falls back to normal INCOME/EXPENSE by sign", () => {
    expect(classifyPicPayRow(row({ amountCents: -2100 }))).toMatchObject({ type: "EXPENSE" });
    expect(classifyPicPayRow(row({ amountCents: 17000 }))).toMatchObject({ type: "INCOME" });
  });

  it("a Pix enviado to an unrelated counterparty stays a normal EXPENSE", () => {
    const result = classifyPicPayRow(
      row({ rawType: "Pix enviado", counterparty: "MARCELO CAMARGO BEZERRA", amountCents: -75000 })
    );
    expect(result).toMatchObject({ type: "EXPENSE" });
  });
});

describe("resolveOrCreateAccountByName (IMP-02 AC3)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reuses an existing account matched by normalized name, regardless of type", async () => {
    accRepo.list.mockResolvedValue([
      { _id: "acc1", name: "  Cofrinho do Rô  ", type: "CHECKING", balance: 0, userId: "user1" },
    ]);
    const result = await resolveOrCreateAccountByName("user1", "cofrinho do rô", "SAVINGS");
    expect(result).toMatchObject({ _id: "acc1" });
    expect(accRepo.create).not.toHaveBeenCalled();
  });

  it("creates a new account with balance 0 when no matching name exists", async () => {
    accRepo.list.mockResolvedValue([]);
    accRepo.create.mockResolvedValue({ _id: "acc2", name: "Investimentos", type: "INVESTMENT", balance: 0 });
    const result = await resolveOrCreateAccountByName("user1", "Investimentos", "INVESTMENT");
    expect(accRepo.create).toHaveBeenCalledWith(
      { userId: "user1", name: "Investimentos", type: "INVESTMENT", balance: 0 },
      undefined
    );
    expect(result).toMatchObject({ _id: "acc2" });
  });
});

describe("importTransactions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("IMP-01 AC3: skips duplicates (same accountId+date+amount+normalized description) and reports the count", async () => {
    txnRepo.list.mockResolvedValue([
      {
        _id: "existing1",
        accountId: "acc1",
        amount: 1000,
        date: new Date("2026-01-10"),
        description: "compra realizada - mercado x",
      },
    ] as never);
    merchantSvc.suggestCategory.mockResolvedValue(null);
    txnRepo.create.mockResolvedValue({} as never);

    const result = await importTransactions("user1", "acc1", [
      row({ description: "Compra realizada - Mercado X", amountCents: -1000 }), // duplicate
      row({ description: "Compra realizada - Farmácia", amountCents: -500 }), // new
    ]);

    expect(result).toEqual({ imported: 1, skipped: 1 });
    expect(txnRepo.create).toHaveBeenCalledTimes(1);
  });

  it("IMP-02 AC1/AC3: cofrinho routing resolves/creates the target account idempotently and produces no categoryId", async () => {
    txnRepo.list.mockResolvedValue([]);
    accRepo.list.mockResolvedValue([]);
    accRepo.create.mockResolvedValue({ _id: "cofrinho1", name: "Viagem", type: "SAVINGS", balance: 0 });
    txnRepo.create.mockResolvedValue({} as never);

    await importTransactions("user1", "acc1", [
      row({
        rawType: "Dinheiro guardado",
        counterparty: "No cofrinho Viagem",
        description: "Dinheiro guardado - No cofrinho Viagem",
        amountCents: -30000,
      }),
    ]);

    expect(accRepo.create).toHaveBeenCalledTimes(1);
    expect(txnRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "acc1",
        toAccountId: "cofrinho1",
        type: "TRANSFER",
        categoryId: undefined,
      }),
      expect.anything()
    );
  });

  it("IMP-01 AC5: adjusts balance once per account with the net effect, including TRANSFER target accounts", async () => {
    txnRepo.list.mockResolvedValue([]);
    merchantSvc.suggestCategory.mockResolvedValue(null);
    txnRepo.create.mockResolvedValue({} as never);

    await importTransactions("user1", "acc1", [
      row({ description: "Receita 1", amountCents: 10000 }),
      row({ description: "Despesa 1", amountCents: -3000 }),
    ]);

    expect(accSvc.adjustBalance).toHaveBeenCalledTimes(1);
    expect(accSvc.adjustBalance).toHaveBeenCalledWith("acc1", 7000, expect.anything());
  });

  it("applies merchant-rule category suggestion to plain INCOME/EXPENSE rows, never to TRANSFER rows", async () => {
    txnRepo.list.mockResolvedValue([]);
    accRepo.list.mockResolvedValue([]);
    accRepo.create.mockResolvedValue({ _id: "invest1", name: "Investimentos", type: "INVESTMENT", balance: 0 });
    merchantSvc.suggestCategory.mockResolvedValue("cat-ifood");
    txnRepo.create.mockResolvedValue({} as never);

    await importTransactions("user1", "acc1", [
      row({ description: "IFOOD *Restaurante", amountCents: -2000 }),
      row({
        rawType: "Pix enviado",
        counterparty: "RICO LTDA",
        description: "Pix enviado - RICO LTDA",
        amountCents: -50000,
      }),
    ]);

    expect(merchantSvc.suggestCategory).toHaveBeenCalledTimes(1);
    expect(txnRepo.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ categoryId: "cat-ifood", type: "EXPENSE" }),
      expect.anything()
    );
    expect(txnRepo.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ categoryId: undefined, type: "TRANSFER" }),
      expect.anything()
    );
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetServerSession = vi.fn();
vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

import {
  listUncategorizedMerchantsAction,
  listMerchantRulesAction,
  categorizeMerchantAction,
} from "./actions";
import { createAccountAction } from "../accounts/actions";
import { createCategoryAction } from "../categories/actions";
import { transactionRepository } from "@/repositories/transaction.repository";

function mockSession(userId: string | null) {
  mockGetServerSession.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

describe("merchants review Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated calls", async () => {
    mockSession(null);
    expect((await listUncategorizedMerchantsAction()).error).toBe("não autenticado");
    expect((await listMerchantRulesAction()).error).toBe("não autenticado");
    expect((await categorizeMerchantAction("ifood", "cat1")).error).toBe("não autenticado");
  });

  it("lists uncategorized merchants, lists rules, and categorizing applies retroactively", async () => {
    mockSession("507f1f77bcf86cd799439033");

    const account = await createAccountAction({ name: "Conta", type: "CHECKING", balance: 0 });
    const accountId = String((account.data as { _id: unknown })._id);
    const category = await createCategoryAction({
      name: "Alimentação",
      color: "#FF0000",
      iconType: "utensils",
    });
    const categoryId = String((category.data as { _id: unknown })._id);

    // Uncategorized EXPENSE transactions only arise outside the normal
    // manual-create flow (which requires categoryId) — e.g. via import, as
    // simulated directly at the repository level here.
    await transactionRepository.create({
      userId: "507f1f77bcf86cd799439033",
      accountId,
      type: "EXPENSE",
      amount: 1000,
      date: new Date("2026-01-10"),
      description: "IFOOD *Restaurante",
      isPaid: true,
    });
    await transactionRepository.create({
      userId: "507f1f77bcf86cd799439033",
      accountId,
      type: "EXPENSE",
      amount: 2000,
      date: new Date("2026-01-11"),
      description: "ifood *restaurante",
      isPaid: true,
    });

    const uncategorized = await listUncategorizedMerchantsAction();
    expect(uncategorized.data).toEqual([
      expect.objectContaining({ merchantKey: "ifood *restaurante", affectedCount: 2 }),
    ]);

    const categorized = await categorizeMerchantAction("ifood *restaurante", categoryId);
    expect(categorized.data).toEqual({ updatedCount: 2 });

    const rules = await listMerchantRulesAction();
    expect(rules.data).toEqual([
      expect.objectContaining({
        merchantKey: "ifood *restaurante",
        categoryId,
        categoryName: "Alimentação",
      }),
    ]);

    const stillUncategorized = await listUncategorizedMerchantsAction();
    expect(stillUncategorized.data).toEqual([]);
  });
});

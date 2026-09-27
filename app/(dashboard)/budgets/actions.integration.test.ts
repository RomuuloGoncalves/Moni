import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetServerSession = vi.fn();
vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

import { setBudgetAction, getBudgetProgressAction } from "./actions";
import { createCategoryAction } from "../categories/actions";
import { createAccountAction } from "../accounts/actions";
import { createTransactionAction } from "../transactions/actions";

function mockSession(userId: string | null) {
  mockGetServerSession.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

describe("budget Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated calls", async () => {
    mockSession(null);
    const result = await setBudgetAction("cat1", 50000);
    expect(result.error).toBe("não autenticado");
  });

  it("rejects an invalid (<=0) limit", async () => {
    mockSession("507f1f77bcf86cd799439021");
    const category = await createCategoryAction({
      name: "Alimentação",
      color: "#FF0000",
      iconType: "utensils",
    });
    const categoryId = String((category.data as { _id: unknown })._id);

    const result = await setBudgetAction(categoryId, 0);

    expect(result.error).toBe("o limite do orçamento deve ser maior que zero");
  });

  it("sets a budget and reports the over-limit progress for the current month", async () => {
    mockSession("507f1f77bcf86cd799439021");

    const category = await createCategoryAction({
      name: "Alimentação",
      color: "#FF0000",
      iconType: "utensils",
    });
    const categoryId = String((category.data as { _id: unknown })._id);

    const account = await createAccountAction({
      name: "Conta",
      type: "CHECKING",
      balance: 0,
    });
    const accountId = String((account.data as { _id: unknown })._id);

    const set = await setBudgetAction(categoryId, 50000);
    expect(set.error).toBeUndefined();

    await createTransactionAction({
      accountId,
      categoryId,
      type: "EXPENSE",
      amount: 60000,
      date: new Date(),
      description: "Mercado",
      isPaid: true,
    });

    const progress = await getBudgetProgressAction();

    expect(progress.error).toBeUndefined();
    expect(progress.data).toEqual([
      {
        categoryId,
        limitCents: 50000,
        spentCents: 60000,
        percentage: 120,
        overLimit: true,
      },
    ]);
  });
});

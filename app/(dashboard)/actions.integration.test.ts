import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetServerSession = vi.fn();
vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

import { getDashboardDataAction } from "./actions";
import { createAccountAction } from "./accounts/actions";
import { createCategoryAction } from "./categories/actions";
import { createTransactionAction } from "./transactions/actions";
import { setBudgetAction } from "./budgets/actions";

function mockSession(userId: string | null) {
  mockGetServerSession.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

describe("dashboard Server Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated calls", async () => {
    mockSession(null);
    const result = await getDashboardDataAction();
    expect(result.error).toBe("não autenticado");
  });

  it("returns the consolidated balance and monthly summary for seeded data", async () => {
    mockSession("507f1f77bcf86cd799439021");

    const account = await createAccountAction({
      name: "Conta Corrente",
      type: "CHECKING",
      balance: 0,
    });
    const accountId = String((account.data as { _id: unknown })._id);

    const category = await createCategoryAction({
      name: "Alimentação",
      color: "#FF0000",
      iconType: "utensils",
    });
    const categoryId = String((category.data as { _id: unknown })._id);

    const now = new Date();

    await createTransactionAction({
      accountId,
      categoryId,
      type: "INCOME",
      amount: 100000,
      date: now,
      description: "Salário",
      isPaid: true,
    });
    await createTransactionAction({
      accountId,
      categoryId,
      type: "EXPENSE",
      amount: 30000,
      date: now,
      description: "Mercado",
      isPaid: true,
    });
    // Unpaid: should not affect balance nor the monthly summary.
    await createTransactionAction({
      accountId,
      categoryId,
      type: "EXPENSE",
      amount: 99999,
      date: now,
      description: "Ainda não pago",
      isPaid: false,
    });

    const result = await getDashboardDataAction();

    expect(result.error).toBeUndefined();
    const data = result.data!;
    expect(data.consolidatedBalance).toBe(70000);
    expect(data.summaryByCategory).toEqual([
      { categoryId, income: 100000, expense: 30000 },
    ]);
  });

  it("BUD-01/DASH-01: flags a category as over-limit when its monthly spend exceeds the set budget", async () => {
    mockSession("507f1f77bcf86cd799439031");

    const account = await createAccountAction({
      name: "Conta Corrente",
      type: "CHECKING",
      balance: 0,
    });
    const accountId = String((account.data as { _id: unknown })._id);

    const category = await createCategoryAction({
      name: "Alimentação",
      color: "#FF0000",
      iconType: "utensils",
    });
    const categoryId = String((category.data as { _id: unknown })._id);

    await setBudgetAction(categoryId, 50000);

    await createTransactionAction({
      accountId,
      categoryId,
      type: "EXPENSE",
      amount: 60000,
      date: new Date(),
      description: "Mercado",
      isPaid: true,
    });

    const result = await getDashboardDataAction();

    expect(result.error).toBeUndefined();
    expect(result.data!.budgetProgress).toEqual([
      {
        categoryId,
        limitCents: 50000,
        spentCents: 60000,
        percentage: 120,
        overLimit: true,
      },
    ]);
  });

  it("returns a zeroed summary for a user with no transactions this month, without error", async () => {
    mockSession("507f1f77bcf86cd799439099");

    const result = await getDashboardDataAction();

    expect(result.error).toBeUndefined();
    expect(result.data!.consolidatedBalance).toBe(0);
    expect(result.data!.summaryByCategory).toEqual([]);
  });
});

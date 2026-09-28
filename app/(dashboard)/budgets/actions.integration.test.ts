import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetServerSession = vi.fn();
vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

import {
  setBudgetAction,
  getBudgetProgressAction,
  createBudgetGroupAction,
  deleteBudgetGroupAction,
} from "./actions";
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

  it("sets a solo budget and reports the over-limit progress for the current month", async () => {
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
        kind: "solo",
        categoryId,
        limitCents: 50000,
        spentCents: 60000,
        percentage: 120,
        overLimit: true,
      },
    ]);
  });

  it("creates a shared budget group and aggregates spend across categories", async () => {
    mockSession("507f1f77bcf86cd799439022");

    const mercado = await createCategoryAction({
      name: "Mercado",
      color: "#22c55e",
      iconType: "shopping-cart",
    });
    const refeicao = await createCategoryAction({
      name: "Refeição",
      color: "#eab308",
      iconType: "utensils",
    });
    const mercadoId = String((mercado.data as { _id: unknown })._id);
    const refeicaoId = String((refeicao.data as { _id: unknown })._id);

    const created = await createBudgetGroupAction({
      name: "Alimentação",
      limitCents: 100000,
      categoryIds: [mercadoId, refeicaoId],
    });
    expect(created.error).toBeUndefined();
    const groupId = String((created.data as { _id: unknown })._id);

    const soloAttempt = await setBudgetAction(mercadoId, 50000);
    expect(soloAttempt.error).toContain("grupo de orçamento");

    const account = await createAccountAction({
      name: "Conta",
      type: "CHECKING",
      balance: 0,
    });
    const accountId = String((account.data as { _id: unknown })._id);

    await createTransactionAction({
      accountId,
      categoryId: mercadoId,
      type: "EXPENSE",
      amount: 40000,
      date: new Date(),
      description: "Supermercado",
      isPaid: true,
    });
    await createTransactionAction({
      accountId,
      categoryId: refeicaoId,
      type: "EXPENSE",
      amount: 30000,
      date: new Date(),
      description: "Restaurante",
      isPaid: true,
    });

    const progress = await getBudgetProgressAction();
    expect(progress.error).toBeUndefined();
    expect(progress.data).toHaveLength(1);
    const item = progress.data![0] as {
      kind: string;
      groupId: string;
      spentCents: number;
      segments: { categoryId: string; spentCents: number }[];
    };
    expect(item.kind).toBe("group");
    expect(item.groupId).toBe(groupId);
    expect(item.spentCents).toBe(70000);

    await deleteBudgetGroupAction(groupId);
    const afterDelete = await getBudgetProgressAction();
    expect(afterDelete.data).toEqual([]);
  });

  it("rejects creating a second group that shares a category", async () => {
    mockSession("507f1f77bcf86cd799439023");

    const a = await createCategoryAction({
      name: "A",
      color: "#000",
      iconType: "tag",
    });
    const b = await createCategoryAction({
      name: "B",
      color: "#111",
      iconType: "tag",
    });
    const c = await createCategoryAction({
      name: "C",
      color: "#222",
      iconType: "tag",
    });
    const aId = String((a.data as { _id: unknown })._id);
    const bId = String((b.data as { _id: unknown })._id);
    const cId = String((c.data as { _id: unknown })._id);

    await createBudgetGroupAction({
      name: "G1",
      limitCents: 50000,
      categoryIds: [aId, bId],
    });

    const conflict = await createBudgetGroupAction({
      name: "G2",
      limitCents: 50000,
      categoryIds: [aId, cId],
    });
    expect(conflict.error).toContain("grupo de orçamento");
  });
});

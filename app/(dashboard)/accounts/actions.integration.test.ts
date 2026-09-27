import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetServerSession = vi.fn();
vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

import {
  listAccountsAction,
  createAccountAction,
  updateAccountAction,
  deleteAccountAction,
} from "./actions";

function mockSession(userId: string | null) {
  mockGetServerSession.mockResolvedValue(
    userId ? { user: { id: userId } } : null
  );
}

describe("account Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated calls", async () => {
    mockSession(null);
    const result = await listAccountsAction();
    expect(result.error).toBe("não autenticado");
  });

  it("creates, lists, updates, and deletes an account end-to-end", async () => {
    mockSession("507f1f77bcf86cd799439021");

    const created = await createAccountAction({
      name: "Conta Corrente",
      type: "CHECKING",
      balance: 1000,
    });
    expect(created.error).toBeUndefined();
    const accountId = String((created.data as { _id: unknown })._id);

    const listed = await listAccountsAction();
    expect(listed.data).toHaveLength(1);

    const updated = await updateAccountAction(accountId, { name: "Renomeada" });
    expect(updated.error).toBeUndefined();
    expect((updated.data as { name: string }).name).toBe("Renomeada");

    const deleted = await deleteAccountAction(accountId);
    expect(deleted.error).toBeUndefined();

    const listedAfter = await listAccountsAction();
    expect(listedAfter.data).toHaveLength(0);
  });

  it("isolates accounts by user: a different user cannot see or delete them", async () => {
    mockSession("507f1f77bcf86cd799439021");
    const created = await createAccountAction({
      name: "Conta",
      type: "CASH",
      balance: 0,
    });
    const accountId = String((created.data as { _id: unknown })._id);

    mockSession("507f1f77bcf86cd799439022");
    const listed = await listAccountsAction();
    expect(listed.data).toHaveLength(0);

    const deleted = await deleteAccountAction(accountId);
    expect(deleted.error).toBe("conta não encontrada");
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetServerSession = vi.fn();
vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

import {
  listCategoriesAction,
  createCategoryAction,
  deleteCategoryAction,
} from "./actions";

function mockSession(userId: string | null) {
  mockGetServerSession.mockResolvedValue(
    userId ? { user: { id: userId } } : null
  );
}

describe("category Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated calls", async () => {
    mockSession(null);
    const result = await listCategoriesAction();
    expect(result.error).toBe("não autenticado");
  });

  it("creates, lists, and deletes a category end-to-end", async () => {
    mockSession("507f1f77bcf86cd799439021");

    const created = await createCategoryAction({
      name: "Alimentação",
      color: "#FF0000",
      iconType: "utensils",
    });
    expect(created.error).toBeUndefined();
    const categoryId = String((created.data as { _id: unknown })._id);

    const listed = await listCategoriesAction();
    expect(listed.data).toHaveLength(1);

    const deleted = await deleteCategoryAction(categoryId);
    expect(deleted.error).toBeUndefined();

    const listedAfter = await listCategoriesAction();
    expect(listedAfter.data).toHaveLength(0);
  });

  it("blocks deleting a category owned by a different user", async () => {
    mockSession("507f1f77bcf86cd799439021");
    const created = await createCategoryAction({
      name: "Lazer",
      color: "#00FF00",
      iconType: "gamepad",
    });
    const categoryId = String((created.data as { _id: unknown })._id);

    mockSession("507f1f77bcf86cd799439022");
    const deleted = await deleteCategoryAction(categoryId);
    expect(deleted.error).toBe("categoria não encontrada");
  });
});

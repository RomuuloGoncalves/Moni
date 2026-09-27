import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { budgetRepository } from "@/repositories/budget.repository";

function newId() {
  return String(new mongoose.Types.ObjectId());
}

describe("budgetRepository", () => {
  it("upsert creates a budget on first call and updates the limit on the second", async () => {
    const userId = newId();
    const categoryId = newId();

    const created = await budgetRepository.upsert(userId, categoryId, 50000);
    expect(created?.limitCents).toBe(50000);

    const updated = await budgetRepository.upsert(userId, categoryId, 70000);
    expect(updated?.limitCents).toBe(70000);

    const all = await budgetRepository.list(userId);
    expect(all).toHaveLength(1);
  });

  it("list returns only budgets belonging to the user", async () => {
    const userId = newId();
    const otherUserId = newId();
    await budgetRepository.upsert(userId, newId(), 10000);
    await budgetRepository.upsert(userId, newId(), 20000);
    await budgetRepository.upsert(otherUserId, newId(), 30000);

    const list = await budgetRepository.list(userId);

    expect(list).toHaveLength(2);
  });

  it("findByCategory returns the budget for a given category and null otherwise", async () => {
    const userId = newId();
    const categoryId = newId();
    await budgetRepository.upsert(userId, categoryId, 15000);

    const found = await budgetRepository.findByCategory(userId, categoryId);
    expect(found?.limitCents).toBe(15000);

    const notFound = await budgetRepository.findByCategory(userId, newId());
    expect(notFound).toBeNull();
  });
});

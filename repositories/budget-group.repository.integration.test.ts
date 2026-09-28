import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { budgetGroupRepository } from "@/repositories/budget-group.repository";

function newId() {
  return String(new mongoose.Types.ObjectId());
}

describe("budgetGroupRepository", () => {
  it("creates and lists groups for a user", async () => {
    const userId = newId();
    const cat1 = newId();
    const cat2 = newId();

    const created = await budgetGroupRepository.create(userId, {
      name: "Alimentação",
      limitCents: 80000,
      categoryIds: [cat1, cat2],
    });
    expect(created.name).toBe("Alimentação");
    expect(created.categoryIds).toHaveLength(2);

    const list = await budgetGroupRepository.list(userId);
    expect(list).toHaveLength(1);
  });

  it("findContainingCategories detects overlap", async () => {
    const userId = newId();
    const cat1 = newId();
    const cat2 = newId();
    await budgetGroupRepository.create(userId, {
      name: "G1",
      limitCents: 10000,
      categoryIds: [cat1, cat2],
    });

    const conflicts = await budgetGroupRepository.findContainingCategories(userId, [cat1]);
    expect(conflicts).toHaveLength(1);

    const none = await budgetGroupRepository.findContainingCategories(userId, [newId()]);
    expect(none).toHaveLength(0);
  });

  it("removeCategoryFromGroups dissolves group when one member left", async () => {
    const userId = newId();
    const cat1 = newId();
    const cat2 = newId();
    const group = await budgetGroupRepository.create(userId, {
      name: "G1",
      limitCents: 10000,
      categoryIds: [cat1, cat2],
    });

    await budgetGroupRepository.removeCategoryFromGroups(userId, cat1);

    const list = await budgetGroupRepository.list(userId);
    expect(list).toHaveLength(0);

    const found = await budgetGroupRepository.findById(userId, String(group._id));
    expect(found).toBeNull();
  });

  it("removeCategoryFromGroups keeps group with two or more members", async () => {
    const userId = newId();
    const cat1 = newId();
    const cat2 = newId();
    const cat3 = newId();
    await budgetGroupRepository.create(userId, {
      name: "G1",
      limitCents: 10000,
      categoryIds: [cat1, cat2, cat3],
    });

    await budgetGroupRepository.removeCategoryFromGroups(userId, cat1);

    const list = await budgetGroupRepository.list(userId);
    expect(list).toHaveLength(1);
    expect(list[0].categoryIds.map(String)).toEqual([cat2, cat3]);
  });
});

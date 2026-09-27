import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { transactionRepository } from "@/repositories/transaction.repository";

function newId() {
  return String(new mongoose.Types.ObjectId());
}

describe("transactionRepository", () => {
  it("create persists a transaction and findById retrieves it scoped by userId", async () => {
    const userId = newId();
    const accountId = newId();
    const created = await transactionRepository.create({
      userId,
      accountId,
      categoryId: newId(),
      type: "EXPENSE",
      amount: 1000,
      date: new Date("2026-01-05"),
      description: "Mercado",
      isPaid: true,
    });

    const found = await transactionRepository.findById(userId, String(created._id));
    expect(found).not.toBeNull();
    expect(found?.description).toBe("Mercado");

    const otherUser = await transactionRepository.findById(newId(), String(created._id));
    expect(otherUser).toBeNull();
  });

  it("list filters by userId, accountId, categoryId, type and date range, sorted by date desc", async () => {
    const userId = newId();
    const accountId = newId();
    const categoryId = newId();

    await transactionRepository.create({
      userId,
      accountId,
      categoryId,
      type: "EXPENSE",
      amount: 500,
      date: new Date("2026-01-01"),
      description: "A",
      isPaid: true,
    });
    await transactionRepository.create({
      userId,
      accountId,
      categoryId,
      type: "EXPENSE",
      amount: 700,
      date: new Date("2026-01-10"),
      description: "B",
      isPaid: true,
    });
    await transactionRepository.create({
      userId,
      accountId: newId(),
      type: "INCOME",
      categoryId,
      amount: 900,
      date: new Date("2026-01-15"),
      description: "C",
      isPaid: true,
    });
    await transactionRepository.create({
      userId: newId(),
      accountId,
      type: "EXPENSE",
      categoryId,
      amount: 100,
      date: new Date("2026-01-20"),
      description: "D (other user)",
      isPaid: true,
    });

    const all = await transactionRepository.list(userId);
    expect(all).toHaveLength(3);
    expect(all[0].description).toBe("C");
    expect(all[2].description).toBe("A");

    const byAccount = await transactionRepository.list(userId, { accountId });
    expect(byAccount).toHaveLength(2);

    const byType = await transactionRepository.list(userId, { type: "INCOME" });
    expect(byType).toHaveLength(1);
    expect(byType[0].description).toBe("C");

    const byRange = await transactionRepository.list(userId, {
      from: new Date("2026-01-05"),
      to: new Date("2026-01-12"),
    });
    expect(byRange).toHaveLength(1);
    expect(byRange[0].description).toBe("B");
  });

  it("update patches fields scoped by userId", async () => {
    const userId = newId();
    const accountId = newId();
    const created = await transactionRepository.create({
      userId,
      accountId,
      categoryId: newId(),
      type: "EXPENSE",
      amount: 200,
      date: new Date("2026-02-01"),
      description: "Original",
      isPaid: false,
    });

    const blocked = await transactionRepository.update(newId(), String(created._id), {
      description: "Hacked",
    });
    expect(blocked).toBeNull();

    const updated = await transactionRepository.update(userId, String(created._id), {
      description: "Updated",
      isPaid: true,
    });
    expect(updated?.description).toBe("Updated");
    expect(updated?.isPaid).toBe(true);
  });

  it("delete removes the transaction scoped by userId", async () => {
    const userId = newId();
    const accountId = newId();
    const created = await transactionRepository.create({
      userId,
      accountId,
      categoryId: newId(),
      type: "EXPENSE",
      amount: 300,
      date: new Date("2026-03-01"),
      description: "To delete",
      isPaid: false,
    });

    const blocked = await transactionRepository.delete(newId(), String(created._id));
    expect(blocked).toBe(false);

    const result = await transactionRepository.delete(userId, String(created._id));
    expect(result).toBe(true);
    expect(await transactionRepository.findById(userId, String(created._id))).toBeNull();
  });

  it("existsFor matches by accountId (origin or destination) and categoryId, and returns false otherwise", async () => {
    const userId = newId();
    const accountId = newId();
    const toAccountId = newId();
    const categoryId = newId();
    const unrelatedAccountId = newId();
    const unrelatedCategoryId = newId();

    await transactionRepository.create({
      userId,
      accountId,
      toAccountId,
      type: "TRANSFER",
      amount: 400,
      date: new Date("2026-04-01"),
      description: "Transfer",
      isPaid: true,
    });
    await transactionRepository.create({
      userId,
      accountId: newId(),
      categoryId,
      type: "EXPENSE",
      amount: 400,
      date: new Date("2026-04-02"),
      description: "Categorized",
      isPaid: true,
    });

    expect(await transactionRepository.existsFor({ accountId })).toBe(true);
    expect(await transactionRepository.existsFor({ accountId: toAccountId })).toBe(true);
    expect(await transactionRepository.existsFor({ categoryId })).toBe(true);
    expect(await transactionRepository.existsFor({ accountId: unrelatedAccountId })).toBe(false);
    expect(await transactionRepository.existsFor({ categoryId: unrelatedCategoryId })).toBe(false);
  });

  it("findDuplicates returns matching docs by accountId+date+amount+description and excludes non-matching", async () => {
    const userId = newId();
    const accountId = newId();
    const date = new Date("2026-05-01");

    await transactionRepository.create({
      userId,
      accountId,
      type: "EXPENSE",
      amount: 555,
      date,
      description: "duplicate candidate",
      isPaid: true,
    });

    const matches = await transactionRepository.findDuplicates(accountId, [
      { date, amount: 555, description: "duplicate candidate" },
      { date, amount: 999, description: "no match" },
    ]);

    expect(matches).toHaveLength(1);
    expect(matches[0].description).toBe("duplicate candidate");

    const noMatches = await transactionRepository.findDuplicates(newId(), [
      { date, amount: 555, description: "duplicate candidate" },
    ]);
    expect(noMatches).toHaveLength(0);
  });
});

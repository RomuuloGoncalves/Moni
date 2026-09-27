import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { merchantCategoryRuleRepository } from "@/repositories/merchant-category-rule.repository";
import { categoryRepository } from "@/repositories/category.repository";
import { transactionRepository } from "@/repositories/transaction.repository";
import { accountRepository } from "@/repositories/account.repository";

function newUserId() {
  return String(new mongoose.Types.ObjectId());
}

async function setupAccountAndCategory(userId: string) {
  const account = await accountRepository.create({
    userId,
    name: "Conta",
    type: "CHECKING",
    balance: 0,
  });
  const category = await categoryRepository.create({
    userId,
    name: "Transporte",
    color: "#000",
    iconType: "car",
  });
  return { accountId: String(account._id), categoryId: String(category._id) };
}

describe("merchantCategoryRuleRepository", () => {
  it("upsert creates a rule and findByMerchantKey retrieves it, scoped by userId", async () => {
    const userId = newUserId();
    const otherUserId = newUserId();
    const { categoryId } = await setupAccountAndCategory(userId);

    await merchantCategoryRuleRepository.upsert(userId, "uber *trip", categoryId);

    expect(await merchantCategoryRuleRepository.findByMerchantKey(userId, "uber *trip")).not.toBeNull();
    expect(
      await merchantCategoryRuleRepository.findByMerchantKey(otherUserId, "uber *trip")
    ).toBeNull();
  });

  it("upsert on an existing (userId, merchantKey) replaces the categoryId instead of duplicating", async () => {
    const userId = newUserId();
    const { categoryId } = await setupAccountAndCategory(userId);
    const otherCategory = await categoryRepository.create({
      userId,
      name: "Lazer",
      color: "#111",
      iconType: "game",
    });

    await merchantCategoryRuleRepository.upsert(userId, "ifood", categoryId);
    await merchantCategoryRuleRepository.upsert(userId, "ifood", String(otherCategory._id));

    const rules = await merchantCategoryRuleRepository.listByUser(userId);
    expect(rules).toHaveLength(1);
    expect(rules[0].categoryId).toBe(String(otherCategory._id));
  });

  it("listUncategorizedMerchants excludes merchants that already have a rule", async () => {
    const userId = newUserId();
    const { accountId, categoryId } = await setupAccountAndCategory(userId);

    await transactionRepository.create({
      userId,
      accountId,
      type: "EXPENSE",
      amount: 1000,
      date: new Date("2026-01-10"),
      description: "IFOOD *Restaurante",
      isPaid: true,
    });
    await transactionRepository.create({
      userId,
      accountId,
      type: "EXPENSE",
      amount: 2000,
      date: new Date("2026-01-11"),
      description: "ifood *restaurante",
      isPaid: true,
    });
    await transactionRepository.create({
      userId,
      accountId,
      categoryId,
      type: "EXPENSE",
      amount: 500,
      date: new Date("2026-01-12"),
      description: "UBER *TRIP",
      isPaid: true,
    });
    await merchantCategoryRuleRepository.upsert(userId, "uber *trip", categoryId);

    const result = await merchantCategoryRuleRepository.listUncategorizedMerchants(userId);

    expect(result).toHaveLength(1);
    expect(result[0].merchantKey).toBe("ifood *restaurante");
    expect(result[0].affectedCount).toBe(2);
  });

  it("bulkSetCategoryForMerchant only updates transactions of the given userId", async () => {
    const userId = newUserId();
    const otherUserId = newUserId();
    const { accountId, categoryId } = await setupAccountAndCategory(userId);
    const { accountId: otherAccountId } = await setupAccountAndCategory(otherUserId);

    const tx1 = await transactionRepository.create({
      userId,
      accountId,
      type: "EXPENSE",
      amount: 1000,
      date: new Date("2026-01-10"),
      description: "IFOOD *Restaurante",
      isPaid: true,
    });
    const otherTx = await transactionRepository.create({
      userId: otherUserId,
      accountId: otherAccountId,
      type: "EXPENSE",
      amount: 1000,
      date: new Date("2026-01-10"),
      description: "ifood *restaurante",
      isPaid: true,
    });

    const modifiedCount = await merchantCategoryRuleRepository.bulkSetCategoryForMerchant(
      userId,
      "ifood *restaurante",
      categoryId
    );

    expect(modifiedCount).toBe(1);
    const updated = await transactionRepository.findById(userId, String(tx1._id));
    expect(String(updated?.categoryId)).toBe(categoryId);
    const untouched = await transactionRepository.findById(otherUserId, String(otherTx._id));
    expect(untouched?.categoryId).toBeUndefined();
  });
});

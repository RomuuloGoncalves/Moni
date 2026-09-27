import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { accountRepository } from "@/repositories/account.repository";

function newUserId() {
  return String(new mongoose.Types.ObjectId());
}

describe("accountRepository", () => {
  it("create persists an account and findById retrieves it for the owning user", async () => {
    const userId = newUserId();
    const created = await accountRepository.create({
      userId,
      name: "Conta Corrente",
      type: "CHECKING",
      balance: 10000,
    });

    const found = await accountRepository.findById(userId, String(created._id));

    expect(found).not.toBeNull();
    expect(found?.name).toBe("Conta Corrente");
    expect(found?.type).toBe("CHECKING");
    expect(found?.balance).toBe(10000);
  });

  it("findById returns null when the account belongs to a different user", async () => {
    const userId = newUserId();
    const otherUserId = newUserId();
    const created = await accountRepository.create({
      userId,
      name: "Conta",
      type: "CASH",
      balance: 0,
    });

    const found = await accountRepository.findById(otherUserId, String(created._id));

    expect(found).toBeNull();
  });

  it("list returns only accounts belonging to the user", async () => {
    const userId = newUserId();
    const otherUserId = newUserId();
    await accountRepository.create({ userId, name: "A1", type: "CASH", balance: 0 });
    await accountRepository.create({ userId, name: "A2", type: "SAVINGS", balance: 0 });
    await accountRepository.create({ userId: otherUserId, name: "B1", type: "CASH", balance: 0 });

    const list = await accountRepository.list(userId);

    expect(list).toHaveLength(2);
    expect(list.map((a) => a.name).sort()).toEqual(["A1", "A2"]);
  });

  it("update persists name/type changes without touching balance", async () => {
    const userId = newUserId();
    const created = await accountRepository.create({
      userId,
      name: "Old name",
      type: "CHECKING",
      balance: 5000,
    });

    const updated = await accountRepository.update(userId, String(created._id), {
      name: "New name",
      type: "SAVINGS",
    });

    expect(updated?.name).toBe("New name");
    expect(updated?.type).toBe("SAVINGS");
    expect(updated?.balance).toBe(5000);
  });

  it("update scoped by userId returns null for another user's account", async () => {
    const userId = newUserId();
    const otherUserId = newUserId();
    const created = await accountRepository.create({
      userId,
      name: "Conta",
      type: "CASH",
      balance: 0,
    });

    const updated = await accountRepository.update(otherUserId, String(created._id), {
      name: "Hacked",
    });

    expect(updated).toBeNull();
  });

  it("delete removes the account and returns true", async () => {
    const userId = newUserId();
    const created = await accountRepository.create({
      userId,
      name: "Conta",
      type: "CASH",
      balance: 0,
    });

    const result = await accountRepository.delete(userId, String(created._id));
    const found = await accountRepository.findById(userId, String(created._id));

    expect(result).toBe(true);
    expect(found).toBeNull();
  });

  it("delete scoped by userId does not remove another user's account", async () => {
    const userId = newUserId();
    const otherUserId = newUserId();
    const created = await accountRepository.create({
      userId,
      name: "Conta",
      type: "CASH",
      balance: 0,
    });

    const result = await accountRepository.delete(otherUserId, String(created._id));
    const stillThere = await accountRepository.findById(userId, String(created._id));

    expect(result).toBe(false);
    expect(stillThere).not.toBeNull();
  });

  it("adjustBalance uses atomic $inc and handles concurrent increments correctly", async () => {
    const userId = newUserId();
    const created = await accountRepository.create({
      userId,
      name: "Conta",
      type: "CHECKING",
      balance: 0,
    });
    const id = String(created._id);

    await Promise.all([
      accountRepository.adjustBalance(id, 100),
      accountRepository.adjustBalance(id, 200),
      accountRepository.adjustBalance(id, -50),
    ]);

    const found = await accountRepository.findById(userId, id);
    expect(found?.balance).toBe(250);
  });
});

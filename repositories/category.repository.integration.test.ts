import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { categoryRepository, DuplicateCategoryError } from "@/repositories/category.repository";

function newUserId() {
  return String(new mongoose.Types.ObjectId());
}

describe("categoryRepository", () => {
  it("create persists a category and list retrieves it for the owning user", async () => {
    const userId = newUserId();
    await categoryRepository.create({
      userId,
      name: "Alimentação",
      color: "#FF0000",
      iconType: "utensils",
    });

    const list = await categoryRepository.list(userId);

    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Alimentação");
  });

  it("list scoped by userId does not include another user's categories", async () => {
    const userId = newUserId();
    const otherUserId = newUserId();
    await categoryRepository.create({
      userId: otherUserId,
      name: "Lazer",
      color: "#00FF00",
      iconType: "gamepad",
    });

    const list = await categoryRepository.list(userId);

    expect(list).toHaveLength(0);
  });

  it("raises DuplicateCategoryError on duplicate name for the same user", async () => {
    const userId = newUserId();
    await categoryRepository.create({
      userId,
      name: "Transporte",
      color: "#0000FF",
      iconType: "car",
    });

    await expect(
      categoryRepository.create({
        userId,
        name: "Transporte",
        color: "#000000",
        iconType: "bus",
      })
    ).rejects.toBeInstanceOf(DuplicateCategoryError);
  });

  it("allows the same category name for different users", async () => {
    const userId = newUserId();
    const otherUserId = newUserId();
    await categoryRepository.create({
      userId,
      name: "Saúde",
      color: "#FFFFFF",
      iconType: "heart",
    });

    await expect(
      categoryRepository.create({
        userId: otherUserId,
        name: "Saúde",
        color: "#FFFFFF",
        iconType: "heart",
      })
    ).resolves.not.toThrow();
  });

  it("delete removes the category and returns true, scoped by userId", async () => {
    const userId = newUserId();
    const otherUserId = newUserId();
    const created = await categoryRepository.create({
      userId,
      name: "Educação",
      color: "#123456",
      iconType: "book",
    });

    const blockedForOtherUser = await categoryRepository.delete(
      otherUserId,
      String(created._id)
    );
    const result = await categoryRepository.delete(userId, String(created._id));

    expect(blockedForOtherUser).toBe(false);
    expect(result).toBe(true);
    expect(await categoryRepository.findById(userId, String(created._id))).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { userRepository, DuplicateEmailError } from "@/repositories/user.repository";

describe("userRepository", () => {
  it("create persists a user and findByEmail retrieves the same doc", async () => {
    const created = await userRepository.create({
      name: "Romulo",
      email: "romulo@example.com",
      passwordHash: "hashed-value",
    });

    const found = await userRepository.findByEmail("romulo@example.com");

    expect(found).not.toBeNull();
    expect(found?.email).toBe("romulo@example.com");
    expect(found?.name).toBe("Romulo");
    expect(found?.passwordHash).toBe("hashed-value");
    expect(String(found?._id)).toBe(String(created._id));
  });

  it("raises DuplicateEmailError on duplicate email insert", async () => {
    await userRepository.create({
      name: "First",
      email: "dup@example.com",
      passwordHash: "hash1",
    });

    await expect(
      userRepository.create({
        name: "Second",
        email: "dup@example.com",
        passwordHash: "hash2",
      })
    ).rejects.toBeInstanceOf(DuplicateEmailError);
  });

  it("findByEmail returns null for a non-existent email", async () => {
    const found = await userRepository.findByEmail("missing@example.com");
    expect(found).toBeNull();
  });
});

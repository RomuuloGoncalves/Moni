import { describe, expect, it, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock("@/repositories/user.repository", () => {
  class DuplicateEmailError extends Error {
    constructor(email: string) {
      super(`A user with email "${email}" already exists`);
      this.name = "DuplicateEmailError";
    }
  }
  return {
    userRepository: { create: createMock },
    DuplicateEmailError,
  };
});

import { registerUser } from "@/services/user.service";
import { DuplicateEmailError } from "@/repositories/user.repository";

describe("user.service.registerUser", () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it("AUTH-01 AC1: hashes the password and never persists it in plain text", async () => {
    createMock.mockImplementation(async (input) => ({ _id: "u1", ...input }));

    await registerUser({ name: "Romulo", email: "r@example.com", password: "plaintext-pw" });

    expect(createMock).toHaveBeenCalledTimes(1);
    const persistedInput = createMock.mock.calls[0][0];
    expect(persistedInput.passwordHash).not.toBe("plaintext-pw");
    expect(typeof persistedInput.passwordHash).toBe("string");
    const matches = await bcrypt.compare("plaintext-pw", persistedInput.passwordHash);
    expect(matches).toBe(true);
  });

  it("AUTH-01 AC2: propagates DuplicateEmailError when the repository reports a conflict", async () => {
    createMock.mockRejectedValue(new DuplicateEmailError("dup@example.com"));

    await expect(
      registerUser({ name: "Dup", email: "dup@example.com", password: "pw12345" })
    ).rejects.toBeInstanceOf(DuplicateEmailError);
  });
});

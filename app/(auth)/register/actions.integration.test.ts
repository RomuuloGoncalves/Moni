import { describe, expect, it } from "vitest";
import { registerAction } from "./actions";
import { userRepository } from "@/repositories/user.repository";

function isNextRedirect(err: unknown): err is { digest: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function buildFormData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

describe("registerAction", () => {
  it("successful registration redirects to /login", async () => {
    const fd = buildFormData({
      name: "Carla",
      email: "carla@example.com",
      password: "senha12345",
    });

    let caught: unknown;
    try {
      await registerAction({}, fd);
    } catch (err) {
      caught = err;
    }

    expect(isNextRedirect(caught)).toBe(true);
    expect((caught as { digest: string }).digest).toContain("/login");

    const created = await userRepository.findByEmail("carla@example.com");
    expect(created).not.toBeNull();
  });

  it('duplicate-email submission returns the "email já cadastrado" message', async () => {
    const fd = buildFormData({
      name: "Primeiro",
      email: "dup@example.com",
      password: "senha12345",
    });
    await expect(registerAction({}, fd)).rejects.toBeDefined();

    const fd2 = buildFormData({
      name: "Segundo",
      email: "dup@example.com",
      password: "outrasenha",
    });
    const result = await registerAction({}, fd2);

    expect(result.error).toBe("email já cadastrado");
  });
});

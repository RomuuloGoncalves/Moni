import { describe, expect, it } from "vitest";
import { authOptions } from "@/lib/auth/options";
import { registerUser } from "@/services/user.service";
import type { CredentialsConfig } from "next-auth/providers/credentials";

// SPEC_DEVIATION: next-auth v4's CredentialsProvider() returns a descriptor whose
// top-level `authorize` is an internal `() => null` stub; the real authorize function
// we configured lives at `provider.options.authorize` and is merged onto the provider
// by NextAuth() only at request-handling time. Tests exercise it directly here.
// Reason: confirmed via runtime inspection (provider.authorize.toString() === "() => null")
// since this repo has no context7 MCP access to the official next-auth docs.
function getAuthorize() {
  const provider = authOptions.providers[0] as unknown as CredentialsConfig & {
    options: CredentialsConfig;
  };
  return provider.options.authorize!;
}

describe("authOptions credentials provider", () => {
  it("AUTH-01 AC3: valid credentials return a user object (session-eligible)", async () => {
    await registerUser({ name: "Ana", email: "ana@example.com", password: "correct-horse" });

    const authorize = getAuthorize();
    const result = await authorize(
      { email: "ana@example.com", password: "correct-horse" },
      {}
    );

    expect(result).not.toBeNull();
    expect((result as { email?: string })?.email).toBe("ana@example.com");
  });

  it("AUTH-01 AC4: invalid password returns null (generic failure, no email-existence leak)", async () => {
    await registerUser({ name: "Bea", email: "bea@example.com", password: "correct-horse" });

    const authorize = getAuthorize();
    const result = await authorize(
      { email: "bea@example.com", password: "wrong-password" },
      {}
    );

    expect(result).toBeNull();
  });

  it("AUTH-01 AC4: unknown email returns null, same as a wrong password", async () => {
    const authorize = getAuthorize();
    const result = await authorize(
      { email: "unknown@example.com", password: "whatever" },
      {}
    );

    expect(result).toBeNull();
  });

  it("AUTH-01 AC6: session maxAge is set to 30 days", () => {
    expect(authOptions.session?.maxAge).toBe(30 * 24 * 60 * 60);
  });
});

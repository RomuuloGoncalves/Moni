import { describe, expect, it, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import middleware from "./middleware";

const secret = "test-middleware-secret";

beforeAll(() => {
  process.env.NEXTAUTH_SECRET = secret;
});

describe("route protection middleware", () => {
  it("AUTH-01 AC5: unauthenticated request to a protected route redirects to /login", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/dashboard"));

    const res = await middleware(req as never, { waitUntil: () => {} } as never);

    expect(res?.status).toBe(307);
    const location = res?.headers.get("location");
    expect(location).toContain("/login");
  });

  it("authenticated request passes through", async () => {
    const token = await encode({
      token: { id: "user-1", name: "Ana", email: "ana@example.com" },
      secret,
      maxAge: 30 * 24 * 60 * 60,
    });

    const req = new NextRequest(new URL("http://localhost:3000/dashboard"), {
      headers: {
        cookie: `next-auth.session-token=${token}`,
      },
    });

    const res = await middleware(req as never, { waitUntil: () => {} } as never);

    // withAuth calls NextResponse.next() for an authorized request, which is not a redirect.
    expect(res?.status).not.toBe(307);
    expect(res?.headers.get("location")).toBeFalsy();
  });
});

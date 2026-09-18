import { describe, expect, it, vi } from "vitest";

// session.ts imports next/headers and the db; neither is needed for the
// pure helpers under test, so stub them.
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/src/lib/db", () => ({ db: {} }));

const { generateSessionToken, hashToken } = await import("@/src/lib/auth/session");

describe("session tokens", () => {
  it("generates unique, URL-safe tokens of adequate length", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[a-z2-7]+$/);
    expect(a.length).toBeGreaterThanOrEqual(38); // 24 bytes -> 39 base32 chars
  });

  it("hashes deterministically to hex SHA-256", () => {
    const token = "example-token";
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toBe(hashToken("example-token2"));
  });
});

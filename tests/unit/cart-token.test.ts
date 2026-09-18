import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
const { issueCartToken, verifyCartCookie } = await import("@/src/modules/cart/token");

describe("cart cookie signing", () => {
  it("round-trips a signed token and rejects tampering", () => {
    const { token, cookieValue } = issueCartToken();
    expect(verifyCartCookie(cookieValue)).toBe(token);
    expect(verifyCartCookie(cookieValue.slice(0, -1) + "x")).toBeNull();
    expect(verifyCartCookie(`${token}x.${cookieValue.split(".")[1]}`)).toBeNull();
    expect(verifyCartCookie("garbage")).toBeNull();
    expect(verifyCartCookie(undefined)).toBeNull();
  });
});

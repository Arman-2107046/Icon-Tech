import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/src/lib/env";

/**
 * Guest carts are keyed by a random token kept in an httpOnly cookie. The
 * cookie value is `<token>.<hmac>` so a tampered or guessed token is
 * rejected before touching the database.
 */
export const CART_COOKIE = "icon_cart";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function sign(token: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(`cart:${token}`).digest("base64url");
}

/** Cookie value for an existing cart token (login merges re-point the cookie). */
export function signedCookieFor(token: string): string {
  return `${token}.${sign(token)}`;
}

export function issueCartToken(): { token: string; cookieValue: string } {
  const token = randomBytes(18).toString("base64url");
  return { token, cookieValue: `${token}.${sign(token)}` };
}

/** Returns the token when the cookie's signature checks out, else null. */
export function verifyCartCookie(value: string | undefined): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const token = value.slice(0, dot);
  const given = value.slice(dot + 1);
  const expected = sign(token);
  if (given.length !== expected.length) return null;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected)) ? token : null;
}

export async function readCartToken(): Promise<string | null> {
  const store = await cookies();
  return verifyCartCookie(store.get(CART_COOKIE)?.value);
}

/** Server Action / Route Handler only. */
export async function writeCartCookie(cookieValue: string): Promise<void> {
  const store = await cookies();
  store.set(CART_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
  });
}

export async function clearCartCookie(): Promise<void> {
  const store = await cookies();
  store.set(CART_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: env.NODE_ENV === "production", path: "/", maxAge: 0 });
}

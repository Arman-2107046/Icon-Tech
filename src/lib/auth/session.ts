import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from "@oslojs/encoding";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/src/lib/db";
import { env } from "@/src/lib/env";
import type { SessionKind } from "@/src/generated/prisma/enums";

/**
 * Cookie sessions, Lucia-style. The browser holds a random token; the
 * database holds only its SHA-256, so a leaked table cannot be replayed.
 * Admin and customer sessions are separate kinds with separate cookies, so
 * a staff member can be logged into the admin and the storefront at once
 * and logging out of one never touches the other.
 */

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const RENEW_AFTER_MS = 15 * 24 * 60 * 60 * 1000; // extend when < 15 days left

const COOKIE_NAME: Record<SessionKind, string> = {
  ADMIN: "icon_admin_session",
  CUSTOMER: "icon_session",
};

export type AdminSession = {
  kind: "ADMIN";
  id: string;
  expiresAt: Date;
  user: { id: string; email: string; name: string };
};

export type CustomerSession = {
  kind: "CUSTOMER";
  id: string;
  expiresAt: Date;
  customer: { id: string; email: string; firstName: string; lastName: string };
};

export function generateSessionToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

export function hashToken(token: string): string {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

function cookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}

async function setSessionCookie(kind: SessionKind, token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME[kind], token, cookieOptions(expiresAt));
}

async function clearSessionCookie(kind: SessionKind): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME[kind], "", { ...cookieOptions(new Date(0)), maxAge: 0 });
}

async function readSessionToken(kind: SessionKind): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME[kind])?.value ?? null;
}

// ---- create ----------------------------------------------------------------

/** Call from a Server Action or Route Handler only (sets a cookie). */
export async function createAdminSession(adminUserId: string): Promise<void> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({
    data: { kind: "ADMIN", tokenHash: hashToken(token), adminUserId, expiresAt },
  });
  await setSessionCookie("ADMIN", token, expiresAt);
}

/** Call from a Server Action or Route Handler only (sets a cookie). */
export async function createCustomerSession(customerId: string): Promise<void> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({
    data: { kind: "CUSTOMER", tokenHash: hashToken(token), customerId, expiresAt },
  });
  await setSessionCookie("CUSTOMER", token, expiresAt);
}

// ---- validate --------------------------------------------------------------

/**
 * Look up the session behind the cookie. Expired rows are deleted on sight;
 * sessions past the halfway mark are silently extended. Wrapped in React
 * `cache` so a layout and its pages share one query per request.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const token = await readSessionToken("ADMIN");
  if (!token) return null;

  const row = await db.session.findUnique({
    where: { tokenHash: hashToken(token), kind: "ADMIN" },
    include: { adminUser: { select: { id: true, email: true, name: true } } },
  });
  if (!row || !row.adminUser) return null;

  if (row.expiresAt.getTime() <= Date.now()) {
    await db.session.delete({ where: { id: row.id } }).catch(() => undefined);
    return null;
  }

  const expiresAt = await maybeRenew(row.id, row.expiresAt);
  return { kind: "ADMIN", id: row.id, expiresAt, user: row.adminUser };
});

export const getCustomerSession = cache(async (): Promise<CustomerSession | null> => {
  const token = await readSessionToken("CUSTOMER");
  if (!token) return null;

  const row = await db.session.findUnique({
    where: { tokenHash: hashToken(token), kind: "CUSTOMER" },
    include: { customer: { select: { id: true, email: true, firstName: true, lastName: true } } },
  });
  if (!row || !row.customer) return null;

  if (row.expiresAt.getTime() <= Date.now()) {
    await db.session.delete({ where: { id: row.id } }).catch(() => undefined);
    return null;
  }

  const expiresAt = await maybeRenew(row.id, row.expiresAt);
  return { kind: "CUSTOMER", id: row.id, expiresAt, customer: row.customer };
});

async function maybeRenew(sessionId: string, expiresAt: Date): Promise<Date> {
  const remaining = expiresAt.getTime() - Date.now();
  if (remaining > RENEW_AFTER_MS) {
    // Touch lastSeenAt cheaply without extending.
    await db.session.update({ where: { id: sessionId }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
    return expiresAt;
  }
  const renewed = new Date(Date.now() + SESSION_TTL_MS);
  await db.session
    .update({ where: { id: sessionId }, data: { expiresAt: renewed, lastSeenAt: new Date() } })
    .catch(() => undefined);
  return renewed;
}

// ---- invalidate ------------------------------------------------------------

/** Log out the current admin. Server Action / Route Handler only. */
export async function invalidateAdminSession(): Promise<void> {
  const token = await readSessionToken("ADMIN");
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  await clearSessionCookie("ADMIN");
}

/** Log out the current customer. Server Action / Route Handler only. */
export async function invalidateCustomerSession(): Promise<void> {
  const token = await readSessionToken("CUSTOMER");
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  await clearSessionCookie("CUSTOMER");
}

/** Revoke every session for a user, e.g. after a password change. */
export async function invalidateAllSessionsFor(
  target: { adminUserId: string } | { customerId: string },
): Promise<void> {
  await db.session.deleteMany({ where: target });
}

/** Housekeeping for the cron route: drop expired rows. */
export async function deleteExpiredSessions(): Promise<number> {
  const result = await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return result.count;
}

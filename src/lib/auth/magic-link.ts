import "server-only";

import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from "@oslojs/encoding";
import { headers } from "next/headers";
import { db } from "@/src/lib/db";
import { enqueueEmail } from "@/src/lib/email/queue";
import { env } from "@/src/lib/env";
import { absoluteUrl } from "@/src/lib/site";

/**
 * Passwordless customer login. A random token is emailed; only its SHA-256
 * is stored. Tokens are single-use and expire after 15 minutes. Requests
 * are rate-limited per email and per IP over a 15-minute window.
 */
const TOKEN_TTL_MS = 15 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 3;
const MAX_PER_IP = 20;

function hash(token: string): string {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0]?.trim() : null) ?? h.get("x-real-ip") ?? null;
}

export type RequestOutcome = { ok: true; devLink: string | null } | { ok: false; error: string };

export async function requestMagicLink(email: string, ip: string | null, nextPath: string | null): Promise<RequestOutcome> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [byEmail, byIp] = await Promise.all([
    db.magicLinkToken.count({ where: { email, createdAt: { gte: since } } }),
    ip ? db.magicLinkToken.count({ where: { ip, createdAt: { gte: since } } }) : Promise.resolve(0),
  ]);
  if (byEmail >= MAX_PER_EMAIL || byIp >= MAX_PER_IP) {
    return { ok: false, error: "Too many sign-in links requested. Please wait a few minutes and try again." };
  }

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = encodeBase32LowerCaseNoPadding(bytes);
  await db.magicLinkToken.create({ data: { email, ip, tokenHash: hash(token), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) } });

  const params = new URLSearchParams({ token, email });
  if (nextPath && nextPath.startsWith("/")) params.set("next", nextPath);
  const link = absoluteUrl(`/account/verify?${params.toString()}`);
  await enqueueEmail({ kind: "magic_link", to: email, subject: "Your sign-in link", payload: { link, email } });

  // Local development has no email provider: surface the link on the page.
  return { ok: true, devLink: env.NODE_ENV !== "production" && !env.RESEND_API_KEY ? link : null };
}

export type VerifyOutcome = { ok: true; email: string } | { ok: false; reason: "invalid" | "expired" | "used" };

/** Redeem a token exactly once. */
export async function verifyMagicLink(token: string, email: string): Promise<VerifyOutcome> {
  const row = await db.magicLinkToken.findUnique({ where: { tokenHash: hash(token) } });
  if (!row || row.email !== email.trim().toLowerCase()) return { ok: false, reason: "invalid" };
  if (row.usedAt) return { ok: false, reason: "used" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  const claimed = await db.magicLinkToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count !== 1) return { ok: false, reason: "used" };
  return { ok: true, email: row.email };
}

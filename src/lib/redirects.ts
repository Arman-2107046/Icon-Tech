import "server-only";

import { db } from "@/src/lib/db";

/**
 * Redirect lookup for the proxy. The proxy runs on every request, so rows
 * are held in memory and refreshed at most once a minute; a saved redirect
 * therefore takes effect within 60 s. Paths are normalised: lower-case,
 * no trailing slash, no query string.
 */
const TTL_MS = 60_000;
let cache: { at: number; map: Map<string, { to: string; status: number }> } | null = null;

export function normalisePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "").toLowerCase();
  return trimmed === "" ? "/" : trimmed;
}

export async function lookupRedirect(pathname: string): Promise<{ to: string; status: number } | null> {
  const now = Date.now();
  if (!cache || now - cache.at > TTL_MS) {
    const rows = await db.redirect.findMany({ select: { fromPath: true, toPath: true, statusCode: true } });
    cache = { at: now, map: new Map(rows.map((r) => [normalisePath(r.fromPath), { to: r.toPath, status: r.statusCode === 302 ? 302 : 301 }])) };
  }
  return cache.map.get(normalisePath(pathname)) ?? null;
}

/** For tests and admin actions: drop the in-memory copy. */
export function resetRedirectCache(): void {
  cache = null;
}

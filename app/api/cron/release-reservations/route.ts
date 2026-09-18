import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/src/lib/env";
import { releaseExpiredReservations } from "@/src/modules/checkout";

/**
 * Releases inventory holds older than 30 minutes. Call every few minutes
 * from a scheduler with `Authorization: Bearer <CRON_SECRET>`. An optional
 * JSON body `{ "olderThanMinutes": n }` overrides the age (ops use: 0
 * releases every hold, e.g. after a stock recount).
 */
export async function POST(request: Request): Promise<Response> {
  const secret = env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  const authorised = secret !== undefined && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!authorised) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  let olderThanMinutes = 30;
  try {
    const body = (await request.json()) as { olderThanMinutes?: unknown };
    if (typeof body.olderThanMinutes === "number" && body.olderThanMinutes >= 0) olderThanMinutes = body.olderThanMinutes;
  } catch {
    // no body: default age
  }
  // Holds expire 30 min after creation; "older than n minutes" = expiry earlier than now + (30 − n) min.
  const cutoff = new Date(Date.now() + (30 - olderThanMinutes) * 60_000);
  const released = await releaseExpiredReservations(cutoff);
  return NextResponse.json({ ok: true, released, olderThanMinutes });
}

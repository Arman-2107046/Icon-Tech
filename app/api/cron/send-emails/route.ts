import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/src/lib/env";
import { processEmailQueue } from "@/src/lib/email/worker";

/** Drains the email outbox. Schedule every minute with `Authorization: Bearer <CRON_SECRET>`. */
export async function POST(request: Request): Promise<Response> {
  const secret = env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  const authorised = secret !== undefined && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!authorised) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const counts = await processEmailQueue();
  return NextResponse.json({ ok: true, ...counts });
}

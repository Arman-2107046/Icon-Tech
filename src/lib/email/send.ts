import "server-only";

import { Resend } from "resend";
import { env } from "@/src/lib/env";

export type SendResult = { ok: true; id: string | null } | { ok: false; error: string } | { skipped: true; reason: string };

/**
 * Send one email through Resend. Without RESEND_API_KEY (local dev) the
 * message is skipped, not faked, so the queue shows what would have gone.
 */
export async function sendEmail(input: { to: string; from: string; subject: string; html: string; text: string }): Promise<SendResult> {
  if (!env.RESEND_API_KEY) return { skipped: true, reason: "RESEND_API_KEY not configured" };
  const resend = new Resend(env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({ from: input.from, to: input.to, subject: input.subject, html: input.html, text: input.text });
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id ?? null };
}

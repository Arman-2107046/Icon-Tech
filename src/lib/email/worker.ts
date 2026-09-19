import "server-only";

import { render } from "@react-email/components";
import { db } from "@/src/lib/db";
import { getCachedSiteSettings } from "@/src/modules/content";
import { renderEmail } from "@/src/emails";
import { sendEmail } from "./send";

const MAX_ATTEMPTS = 5;

/** Drain up to `limit` queued jobs. Returns counts for the cron response. */
export async function processEmailQueue(limit = 20): Promise<{ sent: number; failed: number; skipped: number }> {
  const settings = await getCachedSiteSettings();
  const fromName = settings.email.fromName || settings.store.name;
  const fromAddress = settings.email.fromAddress || settings.store.email;
  const from = fromAddress ? `${fromName} <${fromAddress}>` : "";
  const counts = { sent: 0, failed: 0, skipped: 0 };

  const jobs = await db.emailJob.findMany({ where: { status: "QUEUED" }, orderBy: { createdAt: "asc" }, take: limit });
  for (const job of jobs) {
    try {
      const element = renderEmail(job.kind, job.payload, { storeName: settings.store.name });
      if (!element) throw new Error(`Unknown email kind: ${job.kind}`);
      if (!from) {
        await db.emailJob.update({ where: { id: job.id }, data: { status: "SKIPPED", attempts: { increment: 1 }, lastError: "No sender address configured (Settings → Email sender)" } });
        counts.skipped++;
        continue;
      }
      const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
      const result = await sendEmail({ to: job.to, from, subject: job.subject, html, text });
      if ("skipped" in result) {
        await db.emailJob.update({ where: { id: job.id }, data: { status: "SKIPPED", attempts: { increment: 1 }, lastError: result.reason } });
        counts.skipped++;
      } else if (result.ok) {
        await db.emailJob.update({ where: { id: job.id }, data: { status: "SENT", attempts: { increment: 1 }, sentAt: new Date(), lastError: null } });
        counts.sent++;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const attempts = job.attempts + 1;
      await db.emailJob.update({ where: { id: job.id }, data: { status: attempts >= MAX_ATTEMPTS ? "FAILED" : "QUEUED", attempts, lastError: message } });
      counts.failed++;
    }
  }
  return counts;
}

import "server-only";

import { db } from "@/src/lib/db";
import type { Prisma } from "@/src/generated/prisma/client";

/**
 * DB-backed outbox. Producers call enqueueEmail(); the worker route drains
 * QUEUED rows, renders and sends. Sending never happens inline in a request.
 */
export async function enqueueEmail(job: { kind: string; to: string; subject: string; payload: Prisma.InputJsonValue }): Promise<string> {
  const row = await db.emailJob.create({ data: job, select: { id: true } });
  return row.id;
}

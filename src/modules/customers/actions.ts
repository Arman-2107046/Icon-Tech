"use server";

// customers module — Server Actions. Every action returns an ActionResult; never throws.

import { z } from "zod";
import { type ActionResult, failFromZod, ok, runAction } from "@/src/lib/action-result";
import { db } from "@/src/lib/db";

const emailSchema = z.object({ email: z.email("Enter a valid email address").transform((v) => v.trim().toLowerCase()) });

/**
 * Newsletter sign-up: creates the customer if needed and opts them in.
 * Idempotent, and never reveals whether the address already existed.
 */
export async function subscribeNewsletter(_prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    const parsed = emailSchema.safeParse({ email: formData.get("email") });
    if (!parsed.success) return failFromZod(parsed.error);
    await db.customer.upsert({
      where: { email: parsed.data.email },
      create: { email: parsed.data.email, acceptsMarketing: true },
      update: { acceptsMarketing: true },
    });
    return ok(null);
  });
}

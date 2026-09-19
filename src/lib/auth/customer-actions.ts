"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { type ActionResult, fail, failFromZod, ok, runAction } from "@/src/lib/action-result";
import { clientIp, requestMagicLink } from "@/src/lib/auth/magic-link";
import { invalidateCustomerSession } from "@/src/lib/auth/session";

const schema = z.object({ email: z.email("Enter a valid email address").transform((v) => v.trim().toLowerCase()) });

export async function sendLoginLink(_prev: ActionResult<{ devLink: string | null }> | null, formData: FormData): Promise<ActionResult<{ devLink: string | null }>> {
  return runAction(async () => {
    const parsed = schema.safeParse({ email: formData.get("email") });
    if (!parsed.success) return failFromZod(parsed.error);
    const next = String(formData.get("next") ?? "");
    const outcome = await requestMagicLink(parsed.data.email, await clientIp(), next || null);
    if (!outcome.ok) return fail(outcome.error);
    return ok({ devLink: outcome.devLink });
  });
}

export async function customerLogout(): Promise<void> {
  await invalidateCustomerSession();
  redirect("/");
}

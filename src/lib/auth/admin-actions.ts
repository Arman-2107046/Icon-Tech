"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { type ActionResult, fail, failFromZod, ok, runAction } from "@/src/lib/action-result";
import { db } from "@/src/lib/db";
import { verifyPassword } from "@/src/lib/auth/password";
import { createAdminSession, invalidateAdminSession } from "@/src/lib/auth/session";

const loginSchema = z.object({
  email: z.email("Enter a valid email address").transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1, "Enter your password"),
});

/** Hash used when the email is unknown, so timing does not reveal accounts. */
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export async function adminLogin(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const result = await runAction<null>(async () => {
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parsed.success) return failFromZod(parsed.error);

    const user = await db.adminUser.findUnique({ where: { email: parsed.data.email } });
    const valid = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, parsed.data.password);
    if (!user || !valid) return fail("Incorrect email or password.");

    await createAdminSession(user.id);
    return ok(null);
  });

  if (result.ok) redirect("/admin");
  return result;
}

export async function adminLogout(): Promise<void> {
  await invalidateAdminSession();
  redirect("/admin/login");
}

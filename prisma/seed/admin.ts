// Seeds one staff account for the admin. Credentials are for local demo use.

import { db } from "../../src/lib/db";
import { hashPassword } from "../../src/lib/auth/password";

export const ADMIN_EMAIL = "admin@icontech.com.bd";
export const ADMIN_PASSWORD = "admin12345";

export async function seedAdmin(): Promise<void> {
  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  await db.adminUser.upsert({
    where: { email: ADMIN_EMAIL },
    create: { email: ADMIN_EMAIL, name: "Store Admin", passwordHash },
    update: { passwordHash },
  });
}

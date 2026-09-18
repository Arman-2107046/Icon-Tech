import { redirect } from "next/navigation";
import {
  type AdminSession,
  type CustomerSession,
  getAdminSession,
  getCustomerSession,
} from "@/src/lib/auth/session";

/**
 * Data-access guards. Layouts call these for the redirect, and every admin
 * page and Server Action calls them again: a layout does not re-run on
 * client-side navigation and never protects a Server Action.
 */

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function requireCustomer(nextPath?: string): Promise<CustomerSession> {
  const session = await getCustomerSession();
  if (!session) {
    const target = nextPath ? `/account/login?next=${encodeURIComponent(nextPath)}` : "/account/login";
    redirect(target);
  }
  return session;
}

/** For Server Actions: throw instead of redirect so the caller gets an ActionResult. */
export async function assertAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

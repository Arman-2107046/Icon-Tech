import { requireAdmin } from "@/src/lib/auth/guards";

/**
 * Everything under /admin except /admin/login. Redirects anonymous
 * visitors to the login page; pages and actions re-check via requireAdmin.
 */
export default async function AdminProtectedLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return children;
}

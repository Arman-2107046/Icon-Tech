import { type NextRequest, NextResponse } from "next/server";
import { lookupRedirect } from "@/src/lib/redirects";

/**
 * Cheap first line of defence: bounce requests to protected areas that
 * carry no session cookie at all, before any rendering happens. The cookie
 * is only checked for presence here; the real validation is requireAdmin /
 * requireCustomer in layouts, pages and Server Actions.
 */

const ADMIN_COOKIE = "icon_admin_session";
const CUSTOMER_COOKIE = "icon_session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Content redirects (admin-managed table) for storefront paths.
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api") && !pathname.startsWith("/_next")) {
    const hit = await lookupRedirect(pathname);
    if (hit) {
      const target = hit.to.startsWith("http") ? new URL(hit.to) : new URL(hit.to, request.url);
      return NextResponse.redirect(target, hit.status);
    }
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!request.cookies.has(ADMIN_COOKIE)) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (pathname.startsWith("/account") && pathname !== "/account/login") {
    if (!request.cookies.has(CUSTOMER_COOKIE)) {
      const url = new URL("/account/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static files; the redirect table
  // may point at any storefront path.
  matcher: ["/((?!_next/|api/|.*\\.[a-zA-Z0-9]+$).*)"],
};

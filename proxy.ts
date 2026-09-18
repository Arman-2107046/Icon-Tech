import { type NextRequest, NextResponse } from "next/server";

/**
 * Cheap first line of defence: bounce requests to protected areas that
 * carry no session cookie at all, before any rendering happens. The cookie
 * is only checked for presence here; the real validation is requireAdmin /
 * requireCustomer in layouts, pages and Server Actions.
 */

const ADMIN_COOKIE = "icon_admin_session";
const CUSTOMER_COOKIE = "icon_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ["/admin/:path*", "/account/:path*"],
};

import { Suspense } from "react";
import { requireCustomer } from "@/src/lib/auth/guards";

// Session-gated: never prerendered as an instant shell (dev-only validation).
export const instant = false;

/**
 * Everything under /account except /account/login. Redirects anonymous
 * visitors to the login page; pages re-check via requireCustomer. The
 * session read is runtime data, so it sits inside Suspense.
 */
export default function AccountProtectedLayout({ children }: LayoutProps<"/account">) {
  return (
    <Suspense fallback={null}>
      <Guard>{children}</Guard>
    </Suspense>
  );
}

async function Guard({ children }: { children: React.ReactNode }) {
  await requireCustomer("/account");
  return children;
}

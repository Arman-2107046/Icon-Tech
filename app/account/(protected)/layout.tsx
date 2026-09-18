import { requireCustomer } from "@/src/lib/auth/guards";

/**
 * Everything under /account except /account/login. Redirects anonymous
 * visitors to the login page; pages re-check via requireCustomer.
 */
export default async function AccountProtectedLayout({ children }: LayoutProps<"/account">) {
  await requireCustomer("/account");
  return children;
}

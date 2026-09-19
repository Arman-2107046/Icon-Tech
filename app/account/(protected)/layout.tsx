import Link from "next/link";
import { Suspense } from "react";
import { requireCustomer } from "@/src/lib/auth/guards";
import { customerLogout } from "@/src/lib/auth/customer-actions";
import { Container, Section } from "@/src/storefront/components/layout";

// Session-gated: never prerendered as an instant shell (dev-only validation).
export const instant = false;

/** /account/*: sidebar nav + signed-in customer; pages re-check via requireCustomer. */
export default function AccountProtectedLayout({ children }: LayoutProps<"/account">) {
  return (
    <Section space="md">
      <Container>
        <Suspense fallback={null}>
          <Shell>{children}</Shell>
        </Suspense>
      </Container>
    </Section>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const session = await requireCustomer("/account");
  return (
    <div className="grid gap-s6 lg:grid-cols-12">
      <aside className="lg:col-span-3">
        <p className="label text-ink-subtle">Signed in as</p>
        <p className="mt-s0-5 truncate text-t-sm font-medium">{session.customer.email}</p>
        <nav aria-label="Account" className="mt-s4 flex flex-col gap-s0-5 text-t-sm">
          <Link href="/account" className="rounded-sf-md px-s1 py-s1 hover:bg-neutral-100">
            Orders
          </Link>
          <Link href="/account/addresses" className="rounded-sf-md px-s1 py-s1 hover:bg-neutral-100">
            Addresses
          </Link>
          <form action={customerLogout}>
            <button type="submit" className="w-full rounded-sf-md px-s1 py-s1 text-left text-ink-muted hover:bg-neutral-100 hover:text-ink">
              Sign out
            </button>
          </form>
        </nav>
      </aside>
      <div className="lg:col-span-9">{children}</div>
    </div>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { getMenu, getCachedSiteSettings } from "@/src/modules/content";
import { Container } from "@/src/storefront/components/layout";
import { CartTrigger, CartTriggerFallback } from "./cart-trigger";
import { MobileNav, MobileNavFallback } from "./mobile-nav";
import { NavMenu, NavMenuView } from "./nav-menu";
import { SearchTrigger } from "./search-trigger";

/**
 * Sticky storefront header. Logo and navigation come from cached reads
 * (settings + "main" menu); the cart count is per visitor and streams in.
 */
export async function Header() {
  const [settings, menu] = await Promise.all([getCachedSiteSettings(), getMenu("main")]);
  const items = menu?.items ?? [];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
      <Container className="flex h-16 items-center gap-s3 lg:h-20">
        <Suspense fallback={<MobileNavFallback />}>
          <MobileNav items={items} storeName={settings.store.name} />
        </Suspense>

        <Link href="/" className="display text-t-md tracking-tight lg:text-t-lg" aria-label={`${settings.store.name} home`}>
          {settings.store.name}
        </Link>

        <Suspense fallback={<NavMenuView items={items} className="ml-s4 hidden lg:flex" />}>
          <NavMenu items={items} className="ml-s4 hidden lg:flex" />
        </Suspense>

        <div className="ml-auto flex items-center gap-s0-5">
          <Link href="/account" className="hidden size-11 items-center justify-center rounded-sf-full text-ink transition-colors hover:bg-neutral-100 lg:inline-flex" aria-label="Account">
            <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.75" />
              <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </Link>
          <SearchTrigger />
          <Suspense fallback={<CartTriggerFallback />}>
            <CartTrigger />
          </Suspense>
        </div>
      </Container>
    </header>
  );
}

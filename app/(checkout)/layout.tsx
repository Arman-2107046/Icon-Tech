import Link from "next/link";
import { getCachedSiteSettings } from "@/src/modules/content";

/** Checkout chrome: logo and a reassurance line only. No navigation, no footer links. */
export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const settings = await getCachedSiteSettings();
  return (
    <div className="flex min-h-full flex-1 flex-col bg-canvas font-text text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-s2 sm:px-s3">
          <Link href="/" className="display text-t-md" aria-label={`${settings.store.name} home`}>
            {settings.store.name}
          </Link>
          <span className="flex items-center gap-1 text-t-xs text-ink-muted">
            <svg className="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden>
              <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            Secure checkout
          </span>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <p className="py-s3 text-center text-t-xs text-ink-subtle">Questions? {settings.store.email || settings.store.phone}</p>
    </div>
  );
}

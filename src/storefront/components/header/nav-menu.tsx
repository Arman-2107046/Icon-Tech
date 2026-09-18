"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { StorefrontMenu } from "@/src/modules/content/types";
import { cx } from "@/src/storefront/lib/cx";

/** Client wrapper: adds the active state from the current URL. */
export function NavMenu({ items, className }: { items: StorefrontMenu["items"]; className?: string }) {
  const pathname = usePathname();
  return <NavMenuView items={items} className={className} pathname={pathname} />;
}

/**
 * Desktop navigation. Pure: renders from props only, so it also serves as
 * the Suspense fallback (no active state) during prerendering.
 */
export function NavMenuView({ items, className, pathname = "" }: { items: StorefrontMenu["items"]; className?: string; pathname?: string }) {
  return (
    <nav aria-label="Main" className={cx("items-center gap-s1", className)}>
      {items.map((item) => {
        const active = pathname === item.url || (item.url !== "/" && pathname.startsWith(item.url));
        const hasChildren = item.children.length > 0;
        return (
          <div key={item.id} className="group relative">
            <Link
              href={item.url}
              className={cx(
                "inline-flex h-10 items-center rounded-sf-full px-s2 text-t-sm font-medium transition-colors duration-200 ease-out-expo hover:bg-neutral-100",
                active ? "text-ink" : "text-ink-muted hover:text-ink",
              )}
              aria-current={active ? "page" : undefined}
              aria-haspopup={hasChildren ? "true" : undefined}
            >
              {item.label}
              {hasChildren ? (
                <svg className="ml-1 size-3.5 text-ink-subtle" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </Link>
            {hasChildren ? (
              <div className="invisible absolute left-0 top-full pt-s1 opacity-0 transition-[opacity,visibility] duration-200 ease-out-expo group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <ul className="min-w-56 rounded-sf-lg border border-line bg-surface p-s1 shadow-e3">
                  {item.children.map((child) => (
                    <li key={child.id}>
                      <Link href={child.url} className="block rounded-sf-md px-s2 py-s1 text-t-sm text-ink-muted transition-colors hover:bg-neutral-100 hover:text-ink">
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

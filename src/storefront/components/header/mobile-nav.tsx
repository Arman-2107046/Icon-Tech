"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { StorefrontMenu } from "@/src/modules/content/types";
import { cx } from "@/src/storefront/lib/cx";

/**
 * Off-canvas navigation for narrow viewports. Built on the native <dialog>
 * so focus trapping, Escape and the inert background come for free. Closes
 * itself on route change. Sub-items render as an expandable group.
 */
export function MobileNav({ items, storeName }: { items: StorefrontMenu["items"]; storeName: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Sync the <dialog> element with React state.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Close on navigation.
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      setOpen(false);
    }
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        className="-ml-s1 inline-flex size-11 items-center justify-center rounded-sf-full text-ink transition-colors hover:bg-neutral-100 lg:hidden"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen(true)}
      >
        <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>

      <dialog
        ref={dialogRef}
        id="mobile-nav"
        aria-label="Menu"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // Backdrop click: the dialog itself is the target only outside the panel.
          if (e.target === dialogRef.current) setOpen(false);
        }}
        className={cx(
          "m-0 h-dvh max-h-none w-[min(88vw,380px)] max-w-none bg-surface p-0 text-ink shadow-e3",
          "backdrop:bg-ink/40 backdrop:backdrop-blur-sm",
          "translate-x-[-100%] opacity-0 transition-[translate,opacity,display,overlay] duration-300 ease-out-expo transition-discrete",
          "open:translate-x-0 open:opacity-100 starting:open:translate-x-[-100%] starting:open:opacity-0",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-line px-s2">
            <span className="display text-t-md">{storeName}</span>
            <button type="button" className="inline-flex size-11 items-center justify-center rounded-sf-full hover:bg-neutral-100" aria-label="Close menu" onClick={() => setOpen(false)}>
              <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-s1 py-s2">
            <ul className="space-y-s0-5">
              {items.map((item) => (
                <li key={item.id}>
                  {item.children.length ? (
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between rounded-sf-md px-s2 py-s1 text-t-md font-medium [&::-webkit-details-marker]:hidden">
                        {item.label}
                        <svg className="size-4 text-ink-subtle transition-transform group-open:rotate-180" viewBox="0 0 16 16" fill="none" aria-hidden>
                          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </summary>
                      <ul className="mb-s1 ml-s2 border-l border-line pl-s2">
                        <li>
                          <Link href={item.url} className="block rounded-sf-md px-s2 py-s1 text-t-base text-ink-muted hover:text-ink">
                            All {item.label.toLowerCase()}
                          </Link>
                        </li>
                        {item.children.map((child) => (
                          <li key={child.id}>
                            <Link href={child.url} className="block rounded-sf-md px-s2 py-s1 text-t-base text-ink-muted hover:text-ink">
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : (
                    <Link href={item.url} className="block rounded-sf-md px-s2 py-s1 text-t-md font-medium hover:bg-neutral-100">
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-line p-s2">
            <Link href="/account" className="block rounded-sf-md px-s2 py-s1 text-t-sm text-ink-muted hover:text-ink">
              Account
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}

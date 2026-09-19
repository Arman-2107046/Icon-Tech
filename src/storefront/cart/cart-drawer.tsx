"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { CartLine } from "@/src/modules/cart/types";
import { EmptyState } from "@/src/storefront/components/empty-state";
import { Button, Price } from "@/src/storefront/components/ui";
import { cx } from "@/src/storefront/lib/cx";
import { EASE } from "@/src/storefront/motion/reveal";
import { useCart } from "./cart-context";

const SPRING = { type: "spring", stiffness: 420, damping: 38, mass: 0.9 } as const;

/**
 * Slide-in cart. A native <dialog> for focus trapping and Escape; the panel
 * itself rides a spring, and the dialog only closes once the exit finishes.
 */
export function CartDrawer() {
  const { cart, loaded, open, closeDrawer, error, dismissError } = useCart();
  const ref = useRef<HTMLDialogElement>(null);
  const reduced = useReducedMotion();
  // The dialog stays open (modal, focus-trapped) until the panel has left.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setMounted(true);
    }
  }, [open]);

  const settle = () => {
    const dialog = ref.current;
    if (dialog?.open) dialog.close();
    setMounted(false);
  };

  return (
    <dialog
      ref={ref}
      aria-label="Cart"
      data-testid="cart-drawer"
      data-state={open ? "open" : "closed"}
      onCancel={(e) => {
        // Escape: run the exit animation instead of snapping shut.
        e.preventDefault();
        closeDrawer();
      }}
      onClose={closeDrawer}
      onClick={(e) => {
        if (e.target === ref.current) closeDrawer();
      }}
      className={cx(
        "m-0 ml-auto h-dvh max-h-none w-[min(92vw,440px)] max-w-none overflow-visible bg-transparent p-0 text-ink",
        "backdrop:bg-ink/40 backdrop:backdrop-blur-sm backdrop:transition-opacity backdrop:duration-300",
        open ? "backdrop:opacity-100" : "backdrop:opacity-0",
      )}
    >
      <AnimatePresence onExitComplete={settle}>
        {open || mounted ? (
          open ? (
            <motion.div
              key="panel"
              className="flex h-full flex-col bg-surface shadow-e3"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%", transition: reduced ? { duration: 0 } : { type: "tween", duration: 0.22, ease: EASE } }}
              transition={reduced ? { duration: 0 } : SPRING}
            >
              <Panel cart={cart} loaded={loaded} error={error} dismissError={dismissError} closeDrawer={closeDrawer} />
            </motion.div>
          ) : null
        ) : null}
      </AnimatePresence>
    </dialog>
  );
}

function Panel({ cart, loaded, error, dismissError, closeDrawer }: { cart: ReturnType<typeof useCart>["cart"]; loaded: boolean; error: string | null; dismissError: () => void; closeDrawer: () => void }) {
  return (
    <>
        <div className="flex h-16 items-center justify-between border-b border-line px-s3">
          <h2 className="display text-t-md">
            Cart{cart.count ? <span className="ml-s1 text-t-sm text-ink-muted">({cart.count})</span> : null}
          </h2>
          <button type="button" className="-mr-s1 inline-flex size-11 items-center justify-center rounded-sf-full hover:bg-neutral-100" aria-label="Close cart" onClick={closeDrawer}>
            <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {error ? (
          <div role="alert" className="flex items-start justify-between gap-s2 bg-danger-soft px-s3 py-s1 text-t-sm text-danger">
            <span>{error}</span>
            <button type="button" onClick={dismissError} className="font-medium underline" aria-label="Dismiss">
              OK
            </button>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-s3">
          {!loaded ? (
            <ul className="divide-y divide-line" aria-busy>
              {[0, 1].map((i) => (
                <li key={i} className="flex gap-s2 py-s3">
                  <div className="aspect-[4/5] w-20 animate-pulse rounded-sf-md bg-neutral-200" />
                  <div className="flex-1 space-y-s1">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200" />
                    <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-200" />
                  </div>
                </li>
              ))}
            </ul>
          ) : cart.lines.length === 0 ? (
            <EmptyCart onClose={closeDrawer} />
          ) : (
            <ul className="divide-y divide-line" data-testid="cart-lines">
              {cart.lines.map((line) => (
                <CartLineRow key={line.id} line={line} />
              ))}
            </ul>
          )}
        </div>

        {cart.lines.length > 0 ? (
          <div className="border-t border-line p-s3">
            <div className="flex items-baseline justify-between">
              <span className="text-t-sm text-ink-muted">Subtotal</span>
              <Price amount={cart.subtotal} currency={cart.currency} size="md" data-testid="cart-subtotal" />
            </div>
            <p className="mt-s0-5 text-t-xs text-ink-subtle">Shipping and tax are calculated at checkout.</p>
            <Button href="/checkout" size="lg" className="mt-s3 w-full" onClick={closeDrawer}>
              Checkout
            </Button>
            <button type="button" onClick={closeDrawer} className="mt-s2 w-full text-center text-t-sm text-ink-muted underline underline-offset-4 hover:text-ink">
              Continue shopping
            </button>
          </div>
        ) : null}
    </>
  );
}

function CartLineRow({ line }: { line: CartLine }) {
  const { setQuantity, removeLine, pendingLines } = useCart();
  const pending = pendingLines.has(line.id);
  const atMax = line.quantity >= line.sellable;
  return (
    <li className={cx("flex gap-s2 py-s3 transition-opacity", pending && "opacity-70")} data-testid="cart-line" data-line-id={line.id}>
      <Link href={`/products/${line.handle}`} className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-sf-md bg-neutral-100">
        {line.imageUrl ? <Image src={line.imageUrl} alt="" fill sizes="80px" className="object-cover" /> : null}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-s2">
          <div className="min-w-0">
            <Link href={`/products/${line.handle}`} className="block truncate text-t-sm font-medium hover:underline">
              {line.title}
            </Link>
            {line.variantTitle && line.variantTitle !== "Default" ? <p className="truncate text-t-xs text-ink-muted">{line.variantTitle}</p> : null}
          </div>
          <Price amount={line.lineTotal} size="sm" />
        </div>
        <div className="mt-auto flex items-center justify-between pt-s1">
          <div className="inline-flex h-9 items-center rounded-sf-full border border-line-strong" role="group" aria-label={`Quantity for ${line.title}`}>
            <button type="button" className="size-9 rounded-l-sf-full text-t-md leading-none hover:bg-neutral-100 disabled:opacity-40" aria-label="Decrease quantity" disabled={pending} onClick={() => void setQuantity(line.id, line.quantity - 1)}>
              −
            </button>
            <span className="min-w-8 text-center text-t-sm tabular-nums" aria-live="polite" data-testid="line-qty">
              {line.quantity}
            </span>
            <button type="button" className="size-9 rounded-r-sf-full text-t-md leading-none hover:bg-neutral-100 disabled:opacity-40" aria-label="Increase quantity" disabled={pending || atMax} title={atMax ? "No more in stock" : undefined} onClick={() => void setQuantity(line.id, line.quantity + 1)}>
              +
            </button>
          </div>
          <button type="button" className="text-t-xs text-ink-muted underline underline-offset-4 hover:text-ink disabled:opacity-40" disabled={pending} onClick={() => void removeLine(line.id)} aria-label={`Remove ${line.title}`}>
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}

function EmptyCart({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState compact art="bag" title="Your cart is empty" body="Nothing in here yet. The new arrivals are a good place to start." action={{ label: "Browse new arrivals", href: "/collections/new-arrivals", onClick: onClose }} testId="cart-empty" />
    </div>
  );
}

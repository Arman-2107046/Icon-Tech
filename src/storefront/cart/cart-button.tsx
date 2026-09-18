"use client";

import { useCart } from "./cart-context";

export function CartButton({ initialCount }: { initialCount: number }) {
  const { cart, loaded, openDrawer } = useCart();
  const count = loaded ? cart.count : initialCount;
  return (
    <button
      type="button"
      onClick={openDrawer}
      className="relative inline-flex size-11 items-center justify-center rounded-sf-full text-ink transition-colors hover:bg-neutral-100"
      aria-label={count ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"}
      data-testid="cart-trigger"
    >
      <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M6 8h12l-1 12H7L6 8z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
      {count ? (
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-sf-full bg-ink px-1 text-t-xs font-medium tabular-nums text-canvas" data-testid="cart-count">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}

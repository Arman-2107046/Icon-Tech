import type { Metadata } from "next";
import { Suspense } from "react";
import { getCheckoutState } from "@/src/modules/checkout";
import { CheckoutSteps } from "@/src/storefront/checkout/checkout-steps";
import { OrderSummary } from "@/src/storefront/checkout/order-summary";
import { ReservationRefresher } from "@/src/storefront/checkout/reservation-refresher";
import { EmptyState } from "@/src/storefront/components/empty-state";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-s2 py-s6 sm:px-s3 lg:py-s10">
      <Suspense fallback={<Skeleton />}>
        <Checkout />
      </Suspense>
    </div>
  );
}

async function Checkout() {
  const state = await getCheckoutState();
  if (state.cart.lines.length === 0) {
    return (
      <EmptyState art="bag" title="Your cart is empty" body="Add something to it and come back — we'll hold your place." action={{ label: "Browse new arrivals", href: "/collections/new-arrivals" }} testId="checkout-empty" />
    );
  }
  return (
    <div className="grid gap-s6 lg:grid-cols-12 lg:gap-s8">
      <div className="lg:col-span-7">
        <h1 className="display display-2xl mb-s5">Checkout</h1>
        <ReservationRefresher />
        <CheckoutSteps state={state} />
      </div>
      <aside className="lg:col-span-5 lg:col-start-8" aria-label="Order summary">
        <OrderSummary state={state} />
      </aside>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-s6 lg:grid-cols-12 lg:gap-s8" aria-busy>
      <div className="space-y-s3 lg:col-span-7">
        <div className="h-10 w-48 animate-pulse rounded bg-neutral-200" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-sf-lg bg-neutral-200" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-sf-lg bg-neutral-200 lg:col-span-5 lg:col-start-8" />
    </div>
  );
}

"use client";

import { RouteError } from "@/src/storefront/components/route-error";

export default function CheckoutError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} title="Checkout hit a snag" body="Your cart and the details you entered are saved. Try again, or come back in a moment." homeHref="/checkout" />;
}

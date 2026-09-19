"use client";

import { RouteError } from "@/src/storefront/components/route-error";

export default function AccountError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} title="We could not load your account" body="Try again in a moment. If it keeps happening, sign out and back in." homeHref="/account" />;
}

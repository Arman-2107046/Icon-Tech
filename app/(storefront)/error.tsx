"use client";

import { RouteError } from "@/src/storefront/components/route-error";

export default function StorefrontError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} />;
}

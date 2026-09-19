"use client";

import { useEffect } from "react";
import { EmptyState } from "@/src/storefront/components/empty-state";
import { Container, Section } from "@/src/storefront/components/layout";

/** Shared body for route error boundaries: log, explain, offer retry. */
export function RouteError({ error, reset, title = "Something went wrong", body = "This page hit a snag on our side. Nothing was charged and your cart is safe.", homeHref = "/" }: { error: Error & { digest?: string }; reset: () => void; title?: string; body?: string; homeHref?: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Section space="lg">
      <Container>
        <EmptyState art="spark" title={title} body={body} action={{ label: "Try again", onClick: reset }} secondary={{ label: "Back home", href: homeHref }} testId="route-error">
          {error.digest ? <p className="mt-s2 text-t-xs text-ink-subtle">Reference {error.digest}</p> : null}
        </EmptyState>
      </Container>
    </Section>
  );
}

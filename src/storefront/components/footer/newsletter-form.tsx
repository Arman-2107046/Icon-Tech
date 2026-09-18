"use client";

import { useActionState } from "react";
import { subscribeNewsletter } from "@/src/modules/customers/actions";
import { Button } from "@/src/storefront/components/ui";
import { inputClasses } from "@/src/storefront/components/ui/input";
import { cx } from "@/src/storefront/lib/cx";

export function NewsletterForm({ className }: { className?: string }) {
  const [state, action, pending] = useActionState(subscribeNewsletter, null);
  const error = state && !state.ok ? (state.fieldErrors?.email ?? state.error) : null;

  if (state?.ok) {
    return (
      <p className={cx("rounded-sf-md bg-success-soft px-s2 py-s1 text-t-sm text-success", className)} role="status">
        You&apos;re on the list. We send one email a month, at most.
      </p>
    );
  }

  return (
    <form action={action} className={className} noValidate>
      <label htmlFor="newsletter-email" className="text-t-sm font-medium text-ink">
        New products, once a month
      </label>
      <div className="mt-s1 flex gap-s1">
        <input
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "newsletter-error" : undefined}
          className={cx(inputClasses, "h-11")}
        />
        <Button type="submit" loading={pending}>
          Subscribe
        </Button>
      </div>
      {error ? (
        <p id="newsletter-error" role="alert" className="mt-s1 text-t-sm text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}

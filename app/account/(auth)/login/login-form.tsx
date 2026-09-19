"use client";

import { useActionState } from "react";
import { sendLoginLink } from "@/src/lib/auth/customer-actions";
import { Button, Input } from "@/src/storefront/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(sendLoginLink, null);
  if (state?.ok) {
    return (
      <div className="mt-s5 rounded-sf-lg border border-line bg-surface p-s4" role="status" data-testid="link-sent">
        <p className="display display-md">Check your email</p>
        <p className="body body-sm mt-s1 text-ink-muted">We sent a sign-in link. It works once and expires in 15 minutes.</p>
        {state.data.devLink ? (
          <p className="mt-s3 text-t-sm">
            <span className="label text-ink-subtle">Development</span>
            <br />
            <a href={state.data.devLink} className="break-all underline underline-offset-4" data-testid="dev-link">
              {state.data.devLink}
            </a>
          </p>
        ) : null}
      </div>
    );
  }
  const error = state && !state.ok ? (state.fieldErrors?.email ?? state.error) : undefined;
  return (
    <form action={action} className="mt-s5 space-y-s3" noValidate>
      <input type="hidden" name="next" value={next} />
      <Input name="email" label="Email" type="email" autoComplete="email" autoFocus error={error} placeholder="you@example.com" />
      <Button type="submit" size="lg" loading={pending}>
        Email me a sign-in link
      </Button>
    </form>
  );
}

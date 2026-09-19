"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { applyDiscountCode, removeDiscountCode } from "@/src/modules/checkout/actions";
import type { AppliedDiscount } from "@/src/modules/discounts/types";
import { Form, FormInput, useForm } from "@/src/storefront/components/form";
import { Button, Price } from "@/src/storefront/components/ui";

/** Applied codes as chips, plus a small form to add one more. */
export function DiscountCodes({ applied }: { applied: AppliedDiscount[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(applied.length === 0);
  return (
    <div className="mt-s3 border-t border-line pt-s3" data-testid="discount-codes">
      {applied.length ? (
        <ul className="flex flex-wrap gap-s1">
          {applied.map((d) => (
            <li key={d.code} className="inline-flex items-center gap-s1 rounded-sf-full bg-neutral-100 py-s0-5 pl-s2 pr-s1 text-t-xs" data-testid="applied-code">
              <span className="font-medium tracking-wide">{d.code}</span>
              {d.freeShipping ? <span className="text-ink-muted">free shipping</span> : <span className="text-ink-muted">−<Price amount={d.amount} size="sm" /></span>}
              <button
                type="button"
                aria-label={`Remove code ${d.code}`}
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await removeDiscountCode(d.code);
                    router.refresh();
                  })
                }
                className="inline-flex size-5 items-center justify-center rounded-sf-full hover:bg-neutral-200"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open ? (
        <Form
          key={applied.length}
          action={applyDiscountCode}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
          className="mt-s2"
        >
          <div className="flex items-end gap-s1">
            <div className="flex-1">
              <FormInput name="code" label="Discount code" hideLabel placeholder="Discount code" autoComplete="off" autoCapitalize="characters" />
            </div>
            <ApplyButton />
          </div>
        </Form>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="mt-s2 text-t-sm underline underline-offset-4">
          Add another code
        </button>
      )}
    </div>
  );
}

function ApplyButton() {
  const { pending } = useForm();
  return (
    <Button type="submit" variant="secondary" loading={pending}>
      Apply
    </Button>
  );
}

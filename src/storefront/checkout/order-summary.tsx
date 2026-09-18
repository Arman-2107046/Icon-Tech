import Image from "next/image";
import type { CheckoutState } from "@/src/modules/checkout";
import { Price } from "@/src/storefront/components/ui";

export function OrderSummary({ state }: { state: CheckoutState }) {
  const { cart, totals, selectedRate, data } = state;
  return (
    <div className="rounded-sf-lg border border-line bg-surface p-s3 lg:sticky lg:top-s3" data-testid="order-summary">
      <h2 className="display text-t-md">Order summary</h2>
      <ul className="mt-s3 divide-y divide-line">
        {cart.lines.map((line) => (
          <li key={line.id} className="flex items-center gap-s2 py-s2">
            <div className="relative aspect-square w-14 shrink-0 overflow-hidden rounded-sf-md bg-neutral-100">
              {line.imageUrl ? <Image src={line.imageUrl} alt="" fill sizes="56px" className="object-cover" /> : null}
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-sf-full bg-ink px-1 text-t-xs text-canvas">{line.quantity}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-t-sm font-medium">{line.title}</p>
              {line.variantTitle !== "Default" ? <p className="truncate text-t-xs text-ink-muted">{line.variantTitle}</p> : null}
            </div>
            <Price amount={line.lineTotal} size="sm" />
          </li>
        ))}
      </ul>
      <dl className="mt-s3 space-y-s1 border-t border-line pt-s3 text-t-sm">
        <Row label="Subtotal">
          <Price amount={totals.subtotal} size="sm" />
        </Row>
        {totals.discount > 0 ? (
          <Row label={`Discount${data.discountCode ? ` (${data.discountCode})` : ""}`}>
            <span className="text-success">−<Price amount={totals.discount} size="sm" /></span>
          </Row>
        ) : null}
        <Row label="Shipping">{selectedRate ? totals.shipping === 0 ? <span className="text-success">Free</span> : <Price amount={totals.shipping} size="sm" /> : <span className="text-ink-subtle">Calculated at next step</span>}</Row>
        <Row label={`Tax${state.taxBps ? ` (${(state.taxBps / 100).toFixed(state.taxBps % 100 ? 2 : 0)}%)` : ""}`}>{data.shippingAddress ? <Price amount={totals.tax} size="sm" /> : <span className="text-ink-subtle">—</span>}</Row>
        <div className="flex items-baseline justify-between border-t border-line pt-s2">
          <dt className="text-t-base font-medium">Total</dt>
          <dd>
            <Price amount={totals.total} size="lg" data-testid="checkout-total" />
          </dd>
        </div>
      </dl>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

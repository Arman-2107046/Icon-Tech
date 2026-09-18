import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { canViewOrder, getOrderForConfirmation } from "@/src/modules/checkout";
import { Button, Price } from "@/src/storefront/components/ui";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

export default function ConfirmationPage({ params }: PageProps<"/checkout/[orderId]/confirmation">) {
  return (
    <div className="mx-auto w-full max-w-[720px] px-s2 py-s8 sm:px-s3 lg:py-s12">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-sf-lg bg-neutral-200" />}>
        <Confirmation params={params} />
      </Suspense>
    </div>
  );
}

type Address = { firstName: string; lastName: string; line1: string; line2: string | null; city: string; region: string | null; postalCode: string | null; country: string; phone: string | null };

async function Confirmation({ params }: { params: PageProps<"/checkout/[orderId]/confirmation">["params"] }) {
  const { orderId } = await params;
  if (!(await canViewOrder(orderId))) notFound();
  const order = await getOrderForConfirmation(orderId);
  if (!order) notFound();
  const ship = order.shippingAddress as Address;

  return (
    <div data-testid="confirmation">
      <p className="label text-success">Order confirmed</p>
      <h1 className="display display-3xl mt-s2">Thanks, {ship.firstName}.</h1>
      <p className="body mt-s2 text-ink-muted">
        Order <strong className="text-ink" data-testid="order-number">#{order.number}</strong> is on its way to being packed. We&apos;ve sent a confirmation to {order.email}.
        {order.payments[0]?.provider === "COD" ? " Please have the total ready in cash for the courier." : null}
      </p>

      <div className="mt-s6 grid gap-s4 rounded-sf-lg border border-line bg-surface p-s3 sm:grid-cols-2">
        <div>
          <h2 className="label text-ink-muted">Delivering to</h2>
          <p className="mt-s1 text-t-sm">
            {ship.firstName} {ship.lastName}
            <br />
            {ship.line1}
            {ship.line2 ? <><br />{ship.line2}</> : null}
            <br />
            {[ship.city, ship.region, ship.postalCode].filter(Boolean).join(", ")}
            <br />
            {ship.country}
            {ship.phone ? <><br />{ship.phone}</> : null}
          </p>
        </div>
        <div>
          <h2 className="label text-ink-muted">Delivery method</h2>
          <p className="mt-s1 text-t-sm">{order.shippingMethod}</p>
          <h2 className="label mt-s3 text-ink-muted">Payment</h2>
          <p className="mt-s1 text-t-sm">Cash on delivery</p>
        </div>
      </div>

      <ul className="mt-s4 divide-y divide-line rounded-sf-lg border border-line bg-surface px-s3">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-s2 py-s2 text-t-sm">
            <span>
              <span className="font-medium">{item.title}</span>
              {item.variantTitle !== "Default" ? <span className="text-ink-muted"> · {item.variantTitle}</span> : null}
              <span className="text-ink-muted"> × {item.quantity}</span>
            </span>
            <Price amount={item.lineTotal} size="sm" />
          </li>
        ))}
      </ul>

      <dl className="mt-s3 space-y-s0-5 text-t-sm">
        <div className="flex justify-between"><dt className="text-ink-muted">Subtotal</dt><dd><Price amount={order.subtotal} size="sm" /></dd></div>
        {order.discountTotal ? <div className="flex justify-between"><dt className="text-ink-muted">Discount</dt><dd>−<Price amount={order.discountTotal} size="sm" /></dd></div> : null}
        <div className="flex justify-between"><dt className="text-ink-muted">Shipping</dt><dd>{order.shippingTotal ? <Price amount={order.shippingTotal} size="sm" /> : "Free"}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-muted">Tax</dt><dd><Price amount={order.taxTotal} size="sm" /></dd></div>
        <div className="flex justify-between border-t border-line pt-s1 text-t-base font-medium"><dt>Total</dt><dd><Price amount={order.total} data-testid="confirmation-total" /></dd></div>
      </dl>

      <div className="mt-s6 flex flex-wrap gap-s2">
        <Button href="/">Continue shopping</Button>
        <Button href="/account" variant="secondary">
          View your orders
        </Button>
      </div>
    </div>
  );
}

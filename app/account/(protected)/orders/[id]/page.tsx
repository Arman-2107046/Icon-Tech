import { notFound } from "next/navigation";
import { requireCustomer } from "@/src/lib/auth/guards";
import { formatMoney, money } from "@/src/lib/money";
import { getCustomerOrder } from "@/src/modules/customers";
import { Badge, Button } from "@/src/storefront/components/ui";

type Address = { firstName: string; lastName: string; line1: string; line2: string | null; city: string; region: string | null; postalCode: string | null; country: string; phone: string | null };

export default async function AccountOrderPage({ params }: PageProps<"/account/orders/[id]">) {
  const session = await requireCustomer("/account");
  const { id } = await params;
  const order = await getCustomerOrder(session.customer.id, id);
  if (!order) notFound();
  const ship = order.shippingAddress as Address;
  const shipped = order.fulfillmentStatus === "FULFILLED";

  return (
    <div data-testid="account-order">
      <p className="label text-ink-muted">Order</p>
      <div className="mt-s1 flex flex-wrap items-center gap-s2">
        <h1 className="display display-2xl">#{order.number}</h1>
        <Badge tone={order.status === "CANCELLED" || order.status === "REFUNDED" ? "danger" : shipped ? "success" : "neutral"}>{order.status === "CANCELLED" ? "Cancelled" : order.status === "REFUNDED" ? "Refunded" : shipped ? "Shipped" : "Processing"}</Badge>
      </div>
      <p className="mt-s1 text-t-sm text-ink-muted">Placed {order.placedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {order.shippingMethod} · {order.payments[0]?.provider === "COD" ? "Cash on delivery" : "Paid online"}</p>

      {order.fulfillments.length ? (
        <div className="mt-s4 rounded-sf-lg border border-line bg-surface p-s3 text-t-sm">
          <p className="font-medium">Shipments</p>
          <ul className="mt-s1 space-y-s0-5 text-ink-muted">
            {order.fulfillments.map((f) => (
              <li key={f.id}>
                {f.carrier ?? "Courier"}
                {f.trackingNumber ? <> · {f.trackingUrl ? <a href={f.trackingUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{f.trackingNumber}</a> : f.trackingNumber}</> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="mt-s4 divide-y divide-line rounded-sf-lg border border-line bg-surface px-s3">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-s2 py-s2 text-t-sm">
            <span>
              <span className="font-medium">{item.title}</span>
              {item.variantTitle !== "Default" ? <span className="text-ink-muted"> · {item.variantTitle}</span> : null}
              <span className="text-ink-muted"> × {item.quantity}</span>
            </span>
            <span className="tabular-nums">{formatMoney(money(item.lineTotal))}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-s3 ml-auto max-w-xs space-y-s0-5 text-t-sm">
        <div className="flex justify-between"><dt className="text-ink-muted">Subtotal</dt><dd className="tabular-nums">{formatMoney(money(order.subtotal))}</dd></div>
        {order.discountTotal ? <div className="flex justify-between"><dt className="text-ink-muted">Discount</dt><dd className="tabular-nums">−{formatMoney(money(order.discountTotal))}</dd></div> : null}
        <div className="flex justify-between"><dt className="text-ink-muted">Shipping</dt><dd className="tabular-nums">{order.shippingTotal ? formatMoney(money(order.shippingTotal)) : "Free"}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-muted">Tax</dt><dd className="tabular-nums">{formatMoney(money(order.taxTotal))}</dd></div>
        <div className="flex justify-between border-t border-line pt-s1 font-medium"><dt>Total</dt><dd className="tabular-nums">{formatMoney(money(order.total))}</dd></div>
      </dl>

      <div className="mt-s4 text-t-sm">
        <p className="label text-ink-subtle">Delivered to</p>
        <p className="mt-s1">{ship.firstName} {ship.lastName}<br />{ship.line1}{ship.line2 ? <><br />{ship.line2}</> : null}<br />{[ship.city, ship.region, ship.postalCode].filter(Boolean).join(", ")} · {ship.country}</p>
      </div>
      <Button href="/account" variant="secondary" className="mt-s5">
        Back to orders
      </Button>
    </div>
  );
}

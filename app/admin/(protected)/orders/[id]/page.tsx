import Link from "next/link";
import { notFound } from "next/navigation";
import { FinancialBadge, FulfillmentBadge, OrderStatusBadge } from "@/src/admin/components/order-badges";
import { PageHeader } from "@/src/admin/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/admin/components/ui/card";
import { InternalNoteForm } from "@/src/admin/features/orders/internal-note";
import { OrderActionBar } from "@/src/admin/features/orders/order-actions";
import { formatDateTime } from "@/src/admin/lib/format";
import { requireAdmin } from "@/src/lib/auth/guards";
import { formatMoney, money } from "@/src/lib/money";
import { fulfilledQuantities, getOrderForAdmin, refundedTotal, type AdminOrder } from "@/src/modules/orders";

type Address = { firstName: string; lastName: string; company?: string | null; line1: string; line2: string | null; city: string; region: string | null; postalCode: string | null; country: string; phone: string | null };

function AddressBlock({ title, address }: { title: string; address: Address }) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
      <p className="mt-1 text-sm">
        {address.firstName} {address.lastName}
        {address.company ? <><br />{address.company}</> : null}
        <br />
        {address.line1}
        {address.line2 ? <><br />{address.line2}</> : null}
        <br />
        {[address.city, address.region, address.postalCode].filter(Boolean).join(", ")} · {address.country}
        {address.phone ? <><br />{address.phone}</> : null}
      </p>
    </div>
  );
}

/** Merge payments, fulfilments and refunds into one dated list. */
function timeline(order: AdminOrder) {
  const events: { at: Date; text: string }[] = [{ at: order.placedAt, text: `Order placed by ${order.customerName}` }];
  for (const p of order.payments) events.push({ at: p.updatedAt, text: `Payment ${p.status.toLowerCase()} · ${p.provider === "COD" ? "cash on delivery" : p.provider} · ${formatMoney(money(p.amount))}` });
  if (order.paidAt) events.push({ at: order.paidAt, text: "Marked as paid" });
  for (const f of order.fulfillments) events.push({ at: f.shippedAt, text: `Shipped via ${f.carrier ?? "courier"}${f.trackingNumber ? ` · ${f.trackingNumber}` : ""}` });
  for (const r of order.refunds) events.push({ at: r.createdAt, text: `Refund ${r.status.toLowerCase()} · ${formatMoney(money(r.amount))} · ${r.reason}` });
  if (order.cancelledAt) events.push({ at: order.cancelledAt, text: "Order cancelled" });
  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export default async function OrderDetailPage({ params }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const order = await getOrderForAdmin(id);
  if (!order) notFound();
  const shipped = fulfilledQuantities(order);
  const refunded = refundedTotal(order);
  const ship = order.shippingAddress as Address;
  const bill = order.billingAddress as Address;

  return (
    <>
      <PageHeader
        title={`Order #${order.number}`}
        description={formatDateTime(order.placedAt)}
        actions={
          <span className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <FinancialBadge status={order.financialStatus} />
            <FulfillmentBadge status={order.fulfillmentStatus} />
          </span>
        }
      />
      <div className="space-y-6 p-6">
        <OrderActionBar
          orderId={order.id}
          status={order.status}
          financialStatus={order.financialStatus}
          refundable={order.total - refunded}
          lines={order.items.map((i) => ({ id: i.id, title: i.title, variantTitle: i.variantTitle, quantity: i.quantity, remaining: i.quantity - (shipped.get(i.id) ?? 0) }))}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Items</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="pb-2 font-medium">Item</th>
                      <th className="pb-2 font-medium">SKU</th>
                      <th className="pb-2 text-right font-medium">Qty</th>
                      <th className="pb-2 text-right font-medium">Shipped</th>
                      <th className="pb-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {order.items.map((item) => (
                      <tr key={item.id} data-testid="order-item">
                        <td className="py-2">
                          <span className="font-medium">{item.title}</span>
                          {item.variantTitle !== "Default" ? <span className="text-muted-foreground"> · {item.variantTitle}</span> : null}
                        </td>
                        <td className="py-2 font-mono text-xs">{item.sku ?? "—"}</td>
                        <td className="py-2 text-right tabular-nums">{item.quantity}</td>
                        <td className="py-2 text-right tabular-nums">{shipped.get(item.id) ?? 0}</td>
                        <td className="py-2 text-right tabular-nums">{formatMoney(money(item.lineTotal))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <dl className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{formatMoney(money(order.subtotal))}</dd></div>
                  {order.discountTotal ? <div className="flex justify-between"><dt className="text-muted-foreground">Discount {order.discountCode ? `(${order.discountCode})` : ""}</dt><dd className="tabular-nums">−{formatMoney(money(order.discountTotal))}</dd></div> : null}
                  <div className="flex justify-between"><dt className="text-muted-foreground">Shipping · {order.shippingMethod}</dt><dd className="tabular-nums">{formatMoney(money(order.shippingTotal))}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Tax</dt><dd className="tabular-nums">{formatMoney(money(order.taxTotal))}</dd></div>
                  <div className="flex justify-between border-t pt-1 font-medium"><dt>Total</dt><dd className="tabular-nums" data-testid="order-total">{formatMoney(money(order.total))}</dd></div>
                  {refunded ? <div className="flex justify-between text-rose-700 dark:text-rose-400"><dt>Refunded</dt><dd className="tabular-nums">−{formatMoney(money(refunded))}</dd></div> : null}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm" data-testid="timeline">
                  {timeline(order).map((e, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="w-40 shrink-0 text-xs text-muted-foreground">{formatDateTime(e.at)}</span>
                      <span>{e.text}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">{order.customerName}</p>
                  <p className="text-muted-foreground">{order.email}</p>
                  {order.phone ? <p className="text-muted-foreground">{order.phone}</p> : null}
                  {order.customer ? (
                    <Link href={`/admin/customers/${order.customer.id}`} className="text-xs underline underline-offset-4">
                      {order.customer._count.orders} order{order.customer._count.orders === 1 ? "" : "s"} · view customer
                    </Link>
                  ) : (
                    <p className="text-xs text-muted-foreground">Guest checkout</p>
                  )}
                </div>
                <AddressBlock title="Shipping address" address={ship} />
                <AddressBlock title="Billing address" address={bill} />
                {order.note ? (
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Customer note</h3>
                    <p className="mt-1">{order.note}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {order.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <span>{p.provider === "COD" ? "Cash on delivery" : p.provider}</span>
                    <span className="text-muted-foreground">{p.status.toLowerCase()} · {formatMoney(money(p.amount))}</span>
                  </div>
                ))}
                {order.fulfillments.length ? (
                  <div className="border-t pt-2">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Shipments</h3>
                    <ul className="mt-1 space-y-1">
                      {order.fulfillments.map((f) => (
                        <li key={f.id}>
                          {f.carrier ?? "Courier"}
                          {f.trackingNumber ? <> · {f.trackingUrl ? <a href={f.trackingUrl} className="underline underline-offset-4" target="_blank" rel="noopener noreferrer">{f.trackingNumber}</a> : f.trackingNumber}</> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <InternalNoteForm orderId={order.id} note={order.internalNote} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

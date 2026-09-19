import "server-only";

import { db } from "@/src/lib/db";
import { enqueueEmail } from "@/src/lib/email/queue";
import { formatMoney, money, type Currency } from "@/src/lib/money";
import { absoluteUrl } from "@/src/lib/site";
import type { OrderEmailPayload } from "@/src/emails";

export type OrderEmailKind = "order_confirmation" | "payment_received" | "shipped" | "refunded";

const SUBJECTS: Record<OrderEmailKind, (n: number) => string> = {
  order_confirmation: (n) => `Order #${n} confirmed`,
  payment_received: (n) => `Payment received for order #${n}`,
  shipped: (n) => `Order #${n} is on its way`,
  refunded: (n) => `Refund for order #${n}`,
};

/** Snapshot the order into a job payload and put it on the outbox. */
export async function queueOrderEmail(orderId: string, kind: OrderEmailKind): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, payments: true, fulfillments: { orderBy: { createdAt: "desc" }, take: 1 }, refunds: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!order) return;
  const currency = (order.currency === "USD" ? "USD" : "BDT") as Currency;
  const fmt = (n: number) => formatMoney(money(n, currency));
  const ship = order.shippingAddress as { firstName: string; line1: string; city: string; country: string };
  const latestShipment = order.fulfillments[0];
  const latestRefund = order.refunds[0];
  const payload: OrderEmailPayload = {
    orderId: order.id,
    number: order.number,
    firstName: ship.firstName,
    email: order.email,
    currency,
    items: order.items.map((i) => ({ title: i.title, variantTitle: i.variantTitle, quantity: i.quantity, lineTotal: fmt(i.lineTotal) })),
    subtotal: fmt(order.subtotal),
    discount: order.discountTotal ? fmt(order.discountTotal) : null,
    shipping: order.shippingTotal ? fmt(order.shippingTotal) : "Free",
    tax: fmt(order.taxTotal),
    total: fmt(order.total),
    shippingMethod: order.shippingMethod ?? "Standard",
    paymentMethod: order.payments[0]?.provider === "COD" ? "cash on delivery" : (order.payments[0]?.provider ?? "card"),
    address: `${ship.line1}, ${ship.city}, ${ship.country}`,
    orderUrl: absoluteUrl(`/account/orders/${order.id}`),
    carrier: latestShipment?.carrier ?? undefined,
    trackingNumber: latestShipment?.trackingNumber ?? null,
    trackingUrl: latestShipment?.trackingUrl ?? null,
    refundAmount: latestRefund ? fmt(latestRefund.amount) : undefined,
    refundReason: latestRefund?.reason,
  };
  await enqueueEmail({ kind, to: order.email, subject: SUBJECTS[kind](order.number), payload });
}

// Orders CSV export. Server only; one row per order.
import "server-only";

import { db } from "@/src/lib/db";
import { money, toMajorUnits } from "@/src/lib/money";

export const ORDER_CSV_HEADERS = ["number", "placed_at", "status", "financial_status", "fulfillment_status", "email", "customer_name", "phone", "items", "subtotal", "discount", "shipping", "tax", "total", "currency", "discount_code", "shipping_method", "payment", "city", "country"] as const;

const major = (minor: number) => toMajorUnits(money(minor)).toFixed(2);

export async function orderCsvRows(range?: { from?: Date; to?: Date }): Promise<(string | number)[][]> {
  const orders = await db.order.findMany({
    where: range?.from || range?.to ? { placedAt: { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) } } : undefined,
    orderBy: { number: "asc" },
    include: { items: { select: { quantity: true } }, payments: { select: { provider: true }, take: 1 } },
  });
  return orders.map((o) => {
    const ship = o.shippingAddress as { city?: string; country?: string };
    return [o.number, o.placedAt.toISOString(), o.status, o.financialStatus, o.fulfillmentStatus, o.email, o.customerName, o.phone ?? "", o.items.reduce((n, i) => n + i.quantity, 0), major(o.subtotal), major(o.discountTotal), major(o.shippingTotal), major(o.taxTotal), major(o.total), o.currency, o.discountCode ?? "", o.shippingMethod ?? "", o.payments[0]?.provider ?? "", ship.city ?? "", ship.country ?? ""];
  });
}

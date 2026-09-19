// customers module — read-side queries. Server only; imported via ./index.ts.
import "server-only";

// ---- account -----------------------------------------------------------------

import { db } from "@/src/lib/db";

export async function listCustomerOrders(customerId: string) {
  return db.order.findMany({
    where: { customerId },
    orderBy: { placedAt: "desc" },
    select: { id: true, number: true, placedAt: true, status: true, financialStatus: true, fulfillmentStatus: true, total: true, currency: true, _count: { select: { items: true } } },
  });
}

export async function getCustomerOrder(customerId: string, orderId: string) {
  return db.order.findFirst({ where: { id: orderId, customerId }, include: { items: { orderBy: { title: "asc" } }, fulfillments: { orderBy: { createdAt: "asc" } }, payments: true } });
}

export async function listCustomerAddresses(customerId: string) {
  return db.address.findMany({ where: { customerId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
}

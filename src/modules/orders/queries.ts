// orders module — read-side queries. Server only; imported via ./index.ts.
import "server-only";

import type { Prisma } from "@/src/generated/prisma/client";
import type { FinancialStatus, FulfillmentStatus, OrderStatus } from "@/src/generated/prisma/enums";
import { db } from "@/src/lib/db";

export type AdminOrderListParams = {
  q: string;
  status?: OrderStatus;
  financial?: FinancialStatus;
  fulfillment?: FulfillmentStatus;
  sort: "placedAt" | "total" | "number";
  dir: "asc" | "desc";
  skip: number;
  take: number;
};

export async function listOrdersForAdmin(params: AdminOrderListParams) {
  const number = /^#?(\d+)$/.exec(params.q.trim())?.[1];
  const where: Prisma.OrderWhereInput = {
    ...(params.q
      ? number
        ? { number: Number(number) }
        : { OR: [{ email: { contains: params.q, mode: "insensitive" } }, { customerName: { contains: params.q, mode: "insensitive" } }] }
      : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.financial ? { financialStatus: params.financial } : {}),
    ...(params.fulfillment ? { fulfillmentStatus: params.fulfillment } : {}),
  };
  const [rows, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { [params.sort]: params.dir },
      skip: params.skip,
      take: params.take,
      select: { id: true, number: true, email: true, customerName: true, status: true, financialStatus: true, fulfillmentStatus: true, total: true, placedAt: true, _count: { select: { items: true } } },
    }),
    db.order.count({ where }),
  ]);
  return { rows, total };
}
export type AdminOrderRow = Awaited<ReturnType<typeof listOrdersForAdmin>>["rows"][number];

export async function getOrderForAdmin(id: string) {
  return db.order.findUnique({
    where: { id },
    include: {
      items: { orderBy: { title: "asc" } },
      payments: { orderBy: { createdAt: "asc" } },
      refunds: { orderBy: { createdAt: "asc" } },
      fulfillments: { orderBy: { createdAt: "asc" } },
      customer: { select: { id: true, email: true, firstName: true, lastName: true, _count: { select: { orders: true } } } },
    },
  });
}
export type AdminOrder = NonNullable<Awaited<ReturnType<typeof getOrderForAdmin>>>;

/** Units of each line already shipped, from fulfillment item snapshots. */
export function fulfilledQuantities(order: AdminOrder): Map<string, number> {
  const map = new Map<string, number>();
  for (const f of order.fulfillments) {
    const items = (Array.isArray(f.items) ? f.items : []) as { orderItemId?: string; orderItemIndex?: number; quantity: number }[];
    for (const it of items) {
      const id = it.orderItemId ?? (typeof it.orderItemIndex === "number" ? order.items[it.orderItemIndex]?.id : undefined);
      if (!id) continue;
      map.set(id, (map.get(id) ?? 0) + it.quantity);
    }
  }
  return map;
}

/** Amount refunded so far (succeeded refunds). */
export function refundedTotal(order: AdminOrder): number {
  return order.refunds.filter((r) => r.status === "SUCCEEDED").reduce((n, r) => n + r.amount, 0);
}

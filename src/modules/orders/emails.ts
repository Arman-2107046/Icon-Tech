import "server-only";

export type OrderEmailKind = "order_confirmation" | "payment_received" | "shipped" | "refunded";

/** Filled in by item 96 (queue) and 97 (templates). */
export async function queueOrderEmail(orderId: string, kind: OrderEmailKind): Promise<void> {
  void orderId;
  void kind;
}

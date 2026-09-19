"use server";

// orders module — Server Actions. Every action returns an ActionResult; never throws.

import { z } from "zod";
import { type ActionResult, fail, failFromZod, ok, runAction } from "@/src/lib/action-result";
import { assertAdmin } from "@/src/lib/auth/guards";
import { db } from "@/src/lib/db";
import { fromMajorUnits } from "@/src/lib/money";
import { getPaymentProvider } from "@/src/modules/checkout";
import { queueOrderEmail } from "./emails";
import { fulfilledQuantities, getOrderForAdmin, refundedTotal } from "./queries";
import { assertTransition, IllegalTransition } from "./state-machine";
import type { OrderStatus } from "@/src/generated/prisma/enums";

async function transition(orderId: string, to: OrderStatus, extra: Parameters<typeof db.order.update>[0]["data"] = {}) {
  const order = await db.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!order) throw new Error("Order not found");
  assertTransition(order.status, to);
  return db.order.update({ where: { id: orderId }, data: { status: to, ...extra } });
}

function handle(error: unknown): ActionResult<null> {
  if (error instanceof IllegalTransition) return fail(error.message);
  throw error;
}

/** COD: the courier collected the cash. */
export async function markOrderPaid(orderId: string): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    try {
      const order = await getOrderForAdmin(orderId);
      if (!order) return fail("Order not found.");
      // Keep FULFILLED if the parcel already went out; payment state is separate.
      const to: OrderStatus = order.status === "FULFILLED" ? "FULFILLED" : "PAID";
      await transition(orderId, to, { financialStatus: "PAID", paidAt: new Date() });
      await db.payment.updateMany({ where: { orderId, status: "PENDING" }, data: { status: "CAPTURED" } });
      await queueOrderEmail(orderId, "payment_received");
      return ok(null);
    } catch (error) {
      return handle(error);
    }
  });
}

export async function completeOrder(orderId: string): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    try {
      await transition(orderId, "COMPLETED");
      return ok(null);
    } catch (error) {
      return handle(error);
    }
  });
}

export async function cancelOrder(orderId: string, _prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
    try {
      const order = await getOrderForAdmin(orderId);
      if (!order) return fail("Order not found.");
      await db.$transaction(async (tx) => {
        assertTransition(order.status, "CANCELLED");
        await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED", financialStatus: order.financialStatus === "PAID" ? order.financialStatus : "VOIDED", cancelledAt: new Date(), internalNote: reason ? `${order.internalNote}\nCancelled: ${reason}`.trim() : order.internalNote } });
        await tx.payment.updateMany({ where: { orderId, status: "PENDING" }, data: { status: "CANCELLED" } });
        // Unshipped units go back to stock.
        const shipped = fulfilledQuantities(order);
        for (const item of order.items) {
          const back = item.quantity - (shipped.get(item.id) ?? 0);
          if (item.variantId && back > 0) await tx.inventoryItem.updateMany({ where: { variantId: item.variantId }, data: { available: { increment: back } } });
        }
      });
      return ok(null);
    } catch (error) {
      return handle(error);
    }
  });
}

const fulfilSchema = z.object({
  carrier: z.string().trim().min(2, "Carrier is required").max(60),
  trackingNumber: z.string().trim().max(80).transform((v) => (v === "" ? null : v)),
  trackingUrl: z.union([z.literal(""), z.url("Enter a full URL")]).transform((v) => (v === "" ? null : v)),
});

/** Ship some or all remaining units. Quantities come as fields `qty:<orderItemId>`. */
export async function fulfilOrder(orderId: string, _prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const parsed = fulfilSchema.safeParse({ carrier: formData.get("carrier") ?? "", trackingNumber: formData.get("trackingNumber") ?? "", trackingUrl: formData.get("trackingUrl") ?? "" });
    if (!parsed.success) return failFromZod(parsed.error);
    const order = await getOrderForAdmin(orderId);
    if (!order) return fail("Order not found.");
    if (order.status === "CANCELLED" || order.status === "REFUNDED") return fail("This order is closed.");

    const shipped = fulfilledQuantities(order);
    const lines: { orderItemId: string; quantity: number }[] = [];
    const fieldErrors: Record<string, string> = {};
    for (const item of order.items) {
      const raw = String(formData.get(`qty:${item.id}`) ?? "0").trim();
      const qty = Number.parseInt(raw || "0", 10);
      const remaining = item.quantity - (shipped.get(item.id) ?? 0);
      if (!Number.isInteger(qty) || qty < 0) fieldErrors[`qty:${item.id}`] = "Enter a whole number";
      else if (qty > remaining) fieldErrors[`qty:${item.id}`] = `Only ${remaining} left to ship`;
      else if (qty > 0) lines.push({ orderItemId: item.id, quantity: qty });
    }
    if (Object.keys(fieldErrors).length) return fail("Please fix the highlighted fields.", fieldErrors);
    if (lines.length === 0) return fail("Choose at least one unit to ship.");

    const totalUnits = order.items.reduce((n, i) => n + i.quantity, 0);
    const shippedAfter = [...shipped.values()].reduce((n, q) => n + q, 0) + lines.reduce((n, l) => n + l.quantity, 0);
    const complete = shippedAfter >= totalUnits;

    try {
      await db.$transaction(async (tx) => {
        await tx.fulfillment.create({ data: { orderId, items: lines, carrier: parsed.data.carrier, trackingNumber: parsed.data.trackingNumber, trackingUrl: parsed.data.trackingUrl } });
        const status = complete ? assertTransition(order.status, "FULFILLED") : order.status;
        await tx.order.update({ where: { id: orderId }, data: { fulfillmentStatus: complete ? "FULFILLED" : "PARTIALLY_FULFILLED", status } });
      });
    } catch (error) {
      return handle(error);
    }
    await queueOrderEmail(orderId, "shipped");
    return ok(null);
  });
}

const refundSchema = z.object({
  amount: z.string().trim().regex(/^\d{1,9}([.,]\d{1,2})?$/, "Enter an amount like 500 or 1299.50"),
  reason: z.string().trim().min(2, "Give a short reason").max(300),
});

/** Record a full or partial refund through the payment provider. */
export async function refundOrder(orderId: string, _prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const parsed = refundSchema.safeParse({ amount: formData.get("amount") ?? "", reason: formData.get("reason") ?? "" });
    if (!parsed.success) return failFromZod(parsed.error);
    const order = await getOrderForAdmin(orderId);
    if (!order) return fail("Order not found.");
    const payment = order.payments.find((p) => p.status === "CAPTURED") ?? order.payments[0];
    if (!payment || order.financialStatus === "UNPAID" || order.financialStatus === "VOIDED") return fail("Nothing has been paid on this order yet.");
    const amount = fromMajorUnits(parsed.data.amount).amount;
    const remaining = order.total - refundedTotal(order);
    if (amount <= 0) return fail("Please fix the highlighted fields.", { amount: "Enter an amount above zero" });
    if (amount > remaining) return fail("Please fix the highlighted fields.", { amount: `At most ${(remaining / 100).toFixed(2)} can still be refunded` });

    const provider = getPaymentProvider(payment.provider === "COD" ? "COD" : "COD");
    const result = await provider.refund({ id: payment.id, providerTxnId: payment.providerTxnId, amount: payment.amount, currency: payment.currency }, amount, parsed.data.reason);
    if (!result.ok) return fail(result.error);

    const full = amount === remaining;
    try {
      await db.$transaction(async (tx) => {
        await tx.refund.create({ data: { orderId, paymentId: payment.id, amount, currency: order.currency, reason: parsed.data.reason, status: "SUCCEEDED", providerTxnId: result.providerTxnId ?? null } });
        const status = full ? assertTransition(order.status, "REFUNDED") : order.status;
        await tx.order.update({ where: { id: orderId }, data: { status, financialStatus: full ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
        if (full) await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
      });
    } catch (error) {
      return handle(error);
    }
    await queueOrderEmail(orderId, "refunded");
    return ok(null);
  });
}

export async function saveInternalNote(orderId: string, _prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const note = String(formData.get("internalNote") ?? "").slice(0, 2000);
    await db.order.update({ where: { id: orderId }, data: { internalNote: note } });
    return ok(null);
  });
}

import "server-only";

import { db } from "@/src/lib/db";
import type { Prisma } from "@/src/generated/prisma/client";
import { planCommit } from "@/src/modules/checkout";

/**
 * Turn a reserved cart into an order, in one transaction:
 *   1. re-read every line's price from the variant row (never trust totals
 *      computed earlier in the request),
 *   2. snapshot items + addresses,
 *   3. commit inventory (available −= qty, reserved −= held),
 *   4. mark the cart converted.
 * Throws on any inconsistency so nothing half-applies.
 */

export type AddressSnapshot = {
  firstName: string;
  lastName: string;
  company: string | null;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
};

export type CreateOrderInput = {
  cartId: string;
  customerId: string | null;
  email: string;
  phone: string;
  shippingAddress: AddressSnapshot;
  billingAddress: AddressSnapshot;
  shippingMethod: string;
  shippingTotal: number;
  taxBps: number;
  /** Already-resolved discounts (see discounts/applyDiscounts); amounts sum to the discount total. */
  discounts: { code: string; id: string; amount: number; freeShipping: boolean }[];
  provider: "COD";
  note: string;
};

export class OrderError extends Error {
  constructor(
    message: string,
    readonly code: "EMPTY" | "STOCK" | "RESERVATION",
  ) {
    super(message);
  }
}

export async function createOrderFromCart(input: CreateOrderInput): Promise<{ id: string; number: number; total: number }> {
  return db.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({
      where: { id: input.cartId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, title: true } },
                inventory: true,
                optionValues: { include: { optionValue: { include: { option: { select: { name: true } } } } } },
              },
            },
          },
        },
        reservations: true,
      },
    });
    if (!cart || cart.status !== "ACTIVE") throw new OrderError("This cart has already been checked out.", "EMPTY");
    if (cart.items.length === 0) throw new OrderError("Your cart is empty.", "EMPTY");

    // Every line must be fully reserved by this cart and still in stock.
    const held = new Map(cart.reservations.map((r) => [r.variantId, r.quantity]));
    const plan = planCommit(
      cart.items.map((item) => ({ variantId: item.variantId, title: item.variant.product.title, quantity: item.quantity, available: item.variant.inventory?.available ?? 0 })),
      held,
    );
    if (!plan.ok) {
      if (plan.problem.reason === "RESERVATION") throw new OrderError("Your checkout hold expired. Please review your cart.", "RESERVATION");
      throw new OrderError(`${plan.problem.title} just sold out.`, "STOCK");
    }

    const covers = await tx.media.findMany({ where: { ownerType: "PRODUCT", ownerId: { in: cart.items.map((i) => i.variant.product.id) }, position: 0 }, select: { ownerId: true, url: true } });
    const coverOf = new Map(covers.map((m) => [m.ownerId, m.url]));

    const items = cart.items.map((item) => ({
      variantId: item.variantId,
      productId: item.variant.product.id,
      title: item.variant.product.title,
      variantTitle: item.variant.title,
      sku: item.variant.sku,
      options: Object.fromEntries(item.variant.optionValues.map((ov) => [ov.optionValue.option.name, ov.optionValue.value])) as Prisma.InputJsonValue,
      imageUrl: coverOf.get(item.variant.product.id) ?? null,
      unitPrice: item.variant.price,
      quantity: item.quantity,
      lineTotal: item.variant.price * item.quantity,
    }));
    const subtotal = items.reduce((n, i) => n + i.lineTotal, 0);
    const discountTotal = Math.min(input.discounts.reduce((n, d) => n + d.amount, 0), subtotal);
    const taxable = subtotal - discountTotal;
    const shippingTotal = input.discounts.some((d) => d.freeShipping) ? 0 : input.shippingTotal;
    const taxTotal = Math.round((taxable * input.taxBps) / 10000);
    const total = taxable + shippingTotal + taxTotal;

    const order = await tx.order.create({
      data: {
        customerId: input.customerId,
        email: input.email,
        customerName: `${input.shippingAddress.firstName} ${input.shippingAddress.lastName}`.trim(),
        phone: input.phone,
        shippingAddress: input.shippingAddress,
        billingAddress: input.billingAddress,
        currency: cart.currency,
        subtotal,
        discountTotal,
        shippingTotal,
        taxTotal,
        total,
        shippingMethod: input.shippingMethod,
        discountCode: input.discounts.length ? input.discounts.map((d) => d.code).join(" + ") : null,
        note: input.note,
        items: { create: items },
        payments: { create: { provider: input.provider, amount: total, currency: cart.currency, status: "PENDING" } },
      },
      select: { id: true, number: true },
    });

    if (input.discounts.length) {
      await tx.discountRedemption.createMany({ data: input.discounts.map((d) => ({ discountId: d.id, orderId: order.id, customerId: input.customerId, amount: d.amount })) });
    }

    // Commit inventory and drop the holds.
    for (const u of plan.updates) {
      await tx.inventoryItem.update({ where: { variantId: u.variantId }, data: { available: { increment: u.available }, reserved: { increment: u.reserved } } });
    }
    await tx.inventoryReservation.deleteMany({ where: { cartId: cart.id } });
    await tx.cart.update({ where: { id: cart.id }, data: { status: "CONVERTED" } });

    return { id: order.id, number: order.number, total };
  });
}

// cart module — read-side queries. Server only; imported via ./index.ts.
import "server-only";

import { db } from "@/src/lib/db";
import { STORE_CURRENCY } from "@/src/lib/money";
import { readCartToken } from "./token";
import { EMPTY_CART, type CartLine, type CartView } from "./types";

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" as const },
    include: {
      variant: {
        include: {
          product: { select: { id: true, handle: true, title: true, options: { select: { name: true } } } },
          inventory: { select: { available: true, reserved: true } },
          optionValues: { include: { optionValue: { include: { option: { select: { name: true } } } } } },
        },
      },
    },
  },
};

type CartRow = NonNullable<Awaited<ReturnType<typeof findActiveCartByToken>>>;

export async function findActiveCartByToken(token: string) {
  return db.cart.findFirst({ where: { token, status: "ACTIVE" }, include: cartInclude });
}

/**
 * Build the view the UI consumes. Prices come from the variant rows, never
 * from anything the client sent, and the totals are summed here.
 */
export async function toCartView(cart: CartRow): Promise<CartView> {
  const productIds = [...new Set(cart.items.map((i) => i.variant.product.id))];
  const media = productIds.length
    ? await db.media.findMany({ where: { ownerType: "PRODUCT", ownerId: { in: productIds }, position: 0 }, select: { ownerId: true, url: true } })
    : [];
  const cover = new Map(media.map((m) => [m.ownerId, m.url]));

  const lines: CartLine[] = cart.items.map((item) => {
    const v = item.variant;
    const sellable = Math.max(0, (v.inventory?.available ?? 0) - (v.inventory?.reserved ?? 0));
    return {
      id: item.id,
      variantId: v.id,
      productId: v.product.id,
      handle: v.product.handle,
      title: v.product.title,
      variantTitle: v.title,
      options: Object.fromEntries(v.optionValues.map((ov) => [ov.optionValue.option.name, ov.optionValue.value])),
      imageUrl: cover.get(v.product.id) ?? null,
      quantity: item.quantity,
      unitPrice: v.price,
      lineTotal: v.price * item.quantity,
      sellable,
    };
  });
  return {
    id: cart.id,
    currency: cart.currency === "USD" ? "USD" : "BDT",
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: lines.reduce((n, l) => n + l.lineTotal, 0),
  };
}

/** The visitor's cart, or an empty view when there is none. */
export async function getCart(): Promise<CartView> {
  const token = await readCartToken();
  if (!token) return { ...EMPTY_CART, currency: STORE_CURRENCY };
  const cart = await findActiveCartByToken(token);
  return cart ? toCartView(cart) : { ...EMPTY_CART, currency: STORE_CURRENCY };
}

/** Number of units in the current visitor's active cart (0 when none). */
export async function getCartItemCount(): Promise<number> {
  const token = await readCartToken();
  if (!token) return 0;
  const result = await db.cartItem.aggregate({ where: { cart: { token, status: "ACTIVE" } }, _sum: { quantity: true } });
  return result._sum.quantity ?? 0;
}

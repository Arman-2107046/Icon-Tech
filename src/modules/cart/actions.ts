"use server";

// cart module — Server Actions. Every action returns an ActionResult; never throws.

import { type ActionResult, fail, ok, runAction } from "@/src/lib/action-result";
import { db } from "@/src/lib/db";
import { STORE_CURRENCY } from "@/src/lib/money";
import { getCustomerSession } from "@/src/lib/auth/session";
import { findActiveCartByToken, getCart, toCartView } from "./queries";
import { issueCartToken, readCartToken, signedCookieFor, writeCartCookie } from "./token";
import { quantitySchema } from "./schemas";
import { MAX_LINE_QUANTITY, type CartView } from "./types";

/**
 * The visitor's active cart, creating one (and its signed cookie) when
 * needed. Only callable where cookies can be written: Server Actions and
 * Route Handlers. A logged-in customer's new cart is linked to them.
 */
export async function getOrCreateCart() {
  const existingToken = await readCartToken();
  if (existingToken) {
    const cart = await findActiveCartByToken(existingToken);
    if (cart) return cart;
  }
  const session = await getCustomerSession();
  const { token, cookieValue } = issueCartToken();
  await db.cart.create({ data: { token, currency: STORE_CURRENCY, customerId: session?.customer.id ?? null } });
  await writeCartCookie(cookieValue);
  const created = await findActiveCartByToken(token);
  if (!created) throw new Error("Cart could not be created");
  return created;
}

/** Ensure a cart exists and return its view (used by the drawer on first open). */
export async function ensureCart(): Promise<ActionResult<CartView>> {
  return runAction<CartView>(async () => ok(await toCartView(await getOrCreateCart())));
}

// ---- line mutations ---------------------------------------------------------

/** Units purchasable for a variant right now, or null when it cannot be sold. */
async function sellableFor(variantId: string): Promise<{ sellable: number; title: string } | null> {
  const variant = await db.variant.findUnique({
    where: { id: variantId },
    select: { title: true, product: { select: { status: true } }, inventory: { select: { available: true, reserved: true } } },
  });
  if (!variant || variant.product.status !== "ACTIVE") return null;
  return { sellable: Math.max(0, (variant.inventory?.available ?? 0) - (variant.inventory?.reserved ?? 0)), title: variant.title };
}

/** Add `quantity` units of a variant (default 1), capped by stock and the per-line limit. */
export async function addToCart(variantId: string, quantity = 1): Promise<ActionResult<CartView>> {
  return runAction<CartView>(async () => {
    const qty = quantitySchema.safeParse(quantity);
    if (!qty.success || qty.data < 1) return fail("Choose a quantity between 1 and 20.");
    const stock = await sellableFor(variantId);
    if (!stock) return fail("That item is no longer available.");
    if (stock.sellable === 0) return fail("Sorry, that item just sold out.");

    const cart = await getOrCreateCart();
    const existing = cart.items.find((i) => i.variantId === variantId);
    const wanted = (existing?.quantity ?? 0) + qty.data;
    const capped = Math.min(wanted, stock.sellable, MAX_LINE_QUANTITY);
    if (capped <= (existing?.quantity ?? 0)) return fail(`Only ${stock.sellable} of that item can be ordered right now.`);

    await db.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      create: { cartId: cart.id, variantId, quantity: capped },
      update: { quantity: capped },
    });
    await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
    const fresh = await findActiveCartByToken(cart.token);
    return ok(await toCartView(fresh ?? cart));
  });
}

/** Set a line's quantity; 0 removes it. Rejects more than can be sold. */
export async function updateCartLine(lineId: string, quantity: number): Promise<ActionResult<CartView>> {
  return runAction<CartView>(async () => {
    const qty = quantitySchema.safeParse(quantity);
    if (!qty.success) return fail(qty.error.issues[0]?.message ?? "Invalid quantity.");
    const cart = await getOrCreateCart();
    const line = cart.items.find((i) => i.id === lineId);
    if (!line) return fail("That item is no longer in your cart.");

    if (qty.data === 0) {
      await db.cartItem.delete({ where: { id: lineId } });
    } else {
      const stock = await sellableFor(line.variantId);
      if (!stock) return fail("That item is no longer available.");
      if (qty.data > stock.sellable) return fail(`Only ${stock.sellable} of ${stock.title} can be ordered right now.`);
      await db.cartItem.update({ where: { id: lineId }, data: { quantity: qty.data } });
    }
    const fresh = await findActiveCartByToken(cart.token);
    return ok(await toCartView(fresh ?? cart));
  });
}

export async function removeCartLine(lineId: string): Promise<ActionResult<CartView>> {
  return updateCartLine(lineId, 0);
}

/** Read-only view for the drawer; never creates a cart or sets a cookie. */
export async function fetchCart(): Promise<ActionResult<CartView>> {
  return runAction<CartView>(async () => ok(await getCart()));
}

// ---- login: merge guest cart into the customer's ------------------------------

/**
 * After a customer signs in: adopt the guest cart as theirs, or fold its
 * lines into their existing active cart (quantities summed and capped),
 * then point the cookie at the surviving cart.
 */
export async function mergeGuestCartIntoCustomer(customerId: string): Promise<void> {
  const token = await readCartToken();
  const guest = token ? await findActiveCartByToken(token) : null;
  const owned = await db.cart.findFirst({ where: { customerId, status: "ACTIVE", ...(guest ? { id: { not: guest.id } } : {}) }, include: { items: true } });

  if (guest && !owned) {
    await db.cart.update({ where: { id: guest.id }, data: { customerId } });
    return;
  }
  if (guest && owned) {
    await db.$transaction(async (tx) => {
      for (const item of guest.items) {
        const existing = owned.items.find((i) => i.variantId === item.variantId);
        const quantity = Math.min((existing?.quantity ?? 0) + item.quantity, MAX_LINE_QUANTITY);
        await tx.cartItem.upsert({
          where: { cartId_variantId: { cartId: owned.id, variantId: item.variantId } },
          create: { cartId: owned.id, variantId: item.variantId, quantity },
          update: { quantity },
        });
      }
      await tx.cart.update({ where: { id: guest.id }, data: { status: "ABANDONED" } });
    });
  }
  const survivor = owned ?? (await db.cart.findFirst({ where: { customerId, status: "ACTIVE" } }));
  if (survivor) await writeCartCookie(signedCookieFor(survivor.token));
}

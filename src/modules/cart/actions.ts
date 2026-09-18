"use server";

// cart module — Server Actions. Every action returns an ActionResult; never throws.

import { type ActionResult, ok, runAction } from "@/src/lib/action-result";
import { db } from "@/src/lib/db";
import { STORE_CURRENCY } from "@/src/lib/money";
import { getCustomerSession } from "@/src/lib/auth/session";
import { findActiveCartByToken, toCartView } from "./queries";
import { issueCartToken, readCartToken, writeCartCookie } from "./token";
import type { CartView } from "./types";

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

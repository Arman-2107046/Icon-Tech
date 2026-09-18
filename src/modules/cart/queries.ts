// cart module — read-side queries. Server only; imported via ./index.ts.
import "server-only";

import { cookies } from "next/headers";
import { db } from "@/src/lib/db";

export const CART_COOKIE = "icon_cart";

/** Number of units in the current visitor's active cart (0 when none). */
export async function getCartItemCount(): Promise<number> {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (!token) return 0;
  const result = await db.cartItem.aggregate({
    where: { cart: { token, status: "ACTIVE" } },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}

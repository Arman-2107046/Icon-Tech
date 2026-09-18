import { getCartItemCount } from "@/src/modules/cart";
import { CartButton } from "@/src/storefront/cart/cart-button";

/** Reads the visitor's cart (cookie): runtime data, so it streams inside Suspense. */
export async function CartTrigger() {
  const count = await getCartItemCount();
  return <CartButton initialCount={count} />;
}

export function CartTriggerFallback() {
  return <CartButton initialCount={0} />;
}

// cart module — public types. Browser-safe: no zod, no server imports.

export const MAX_LINE_QUANTITY = 20;

export type CartLine = {
  id: string;
  variantId: string;
  productId: string;
  handle: string;
  title: string;
  variantTitle: string;
  options: Record<string, string>;
  imageUrl: string | null;
  quantity: number;
  /** Minor units, from the variant row at read time. */
  unitPrice: number;
  lineTotal: number;
  /** Units purchasable right now; the UI caps the stepper at this. */
  sellable: number;
};

export type CartView = {
  id: string;
  currency: "BDT" | "USD";
  lines: CartLine[];
  /** Sum of quantities. */
  count: number;
  /** Minor units. Recomputed from variant prices on every read. */
  subtotal: number;
};

export const EMPTY_CART: CartView = { id: "", currency: "BDT", lines: [], count: 0, subtotal: 0 };

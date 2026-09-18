// Pure order arithmetic. Every amount is integer minor units. Unit-tested.

export type TotalsInput = {
  /** Sum of line totals from DB prices. */
  subtotal: number;
  /** Already-resolved discount amount (0 when none), never above subtotal. */
  discount: number;
  /** Selected shipping rate price; 0 when free or not chosen yet. */
  shipping: number;
  /** Basis points, e.g. 500 = 5%. */
  taxBps: number;
  /** Whether a free-shipping discount applies. */
  freeShipping?: boolean;
};

export type Totals = {
  subtotal: number;
  discount: number;
  taxable: number;
  shipping: number;
  tax: number;
  total: number;
};

/** Tax applies to the subtotal after discounts; shipping is not taxed. */
export function computeTotals(input: TotalsInput): Totals {
  const discount = Math.min(Math.max(0, input.discount), input.subtotal);
  const taxable = input.subtotal - discount;
  const shipping = input.freeShipping ? 0 : Math.max(0, input.shipping);
  const tax = Math.round((taxable * Math.max(0, input.taxBps)) / 10000);
  return { subtotal: input.subtotal, discount, taxable, shipping, tax, total: taxable + shipping + tax };
}

/** Which of a zone's rates apply to a subtotal (after discounts). */
export function eligibleRates<T extends { minOrderSubtotal: number | null; maxOrderSubtotal: number | null }>(rates: T[], taxable: number): T[] {
  return rates.filter((r) => (r.minOrderSubtotal === null || taxable >= r.minOrderSubtotal) && (r.maxOrderSubtotal === null || taxable <= r.maxOrderSubtotal));
}

/** Country+region rate beats the country-wide rate; none means 0%. */
export function pickTaxBps<T extends { country: string; region: string | null; rateBps: number }>(rates: T[], country: string, region: string | null): number {
  const exact = region ? rates.find((r) => r.country === country && r.region?.toLowerCase() === region.toLowerCase()) : undefined;
  const wide = rates.find((r) => r.country === country && r.region === null);
  return (exact ?? wide)?.rateBps ?? 0;
}

// discounts module — public types. Browser-safe: no zod, no server imports.

export const DISCOUNT_TYPES = ["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"] as const;
export type DiscountTypeValue = (typeof DISCOUNT_TYPES)[number];

export type { DiscountInput } from "./schemas";

// ---- stacking ---------------------------------------------------------------

/** A discount that already passed eligibility checks, ready to be applied. */
export type ApplicableDiscount = { id: string; code: string; type: DiscountTypeValue; value: number; stackable: boolean };

export type AppliedDiscount = { id: string; code: string; amount: number; freeShipping: boolean };

export type DiscountApplication = { applied: AppliedDiscount[]; amount: number; freeShipping: boolean };

/**
 * Stacking rules, in order:
 *  1. A non-stackable code is exclusive: if any is present only the first
 *     one applies (callers reject adding others up front).
 *  2. Percentages apply first, against the subtotal, capped at 100% combined.
 *  3. Fixed amounts apply next, against what remains.
 *  4. Free shipping is a flag; it takes nothing off the subtotal.
 * Total never exceeds the subtotal. Every amount is integer minor units.
 */
export function applyDiscounts(discounts: readonly ApplicableDiscount[], subtotal: number): DiscountApplication {
  const exclusive = discounts.find((d) => !d.stackable);
  const set = exclusive ? [exclusive] : [...discounts];
  const order: Record<DiscountTypeValue, number> = { PERCENTAGE: 0, FIXED_AMOUNT: 1, FREE_SHIPPING: 2 };
  set.sort((a, b) => order[a.type] - order[b.type]);

  let remaining = Math.max(0, subtotal);
  let percentUsed = 0;
  const applied: AppliedDiscount[] = [];
  for (const d of set) {
    if (d.type === "PERCENTAGE") {
      const bps = Math.min(d.value, 10_000 - percentUsed);
      percentUsed += bps;
      const amount = Math.min(remaining, Math.round((subtotal * bps) / 10_000));
      remaining -= amount;
      applied.push({ id: d.id, code: d.code, amount, freeShipping: false });
    } else if (d.type === "FIXED_AMOUNT") {
      const amount = Math.min(remaining, Math.max(0, d.value));
      remaining -= amount;
      applied.push({ id: d.id, code: d.code, amount, freeShipping: false });
    } else {
      applied.push({ id: d.id, code: d.code, amount: 0, freeShipping: true });
    }
  }
  return { applied, amount: subtotal - remaining, freeShipping: applied.some((a) => a.freeShipping) };
}

/** Whether `code` may join the set of codes already in the cart. */
export function canCombine(existing: readonly { stackable: boolean }[], next: { stackable: boolean }): boolean {
  if (existing.length === 0) return true;
  return next.stackable && existing.every((d) => d.stackable);
}

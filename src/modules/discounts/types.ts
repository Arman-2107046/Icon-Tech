// discounts module — public types. Browser-safe (no server imports).
import { z } from "zod";

export const DISCOUNT_TYPES = ["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"] as const;
export type DiscountTypeValue = (typeof DISCOUNT_TYPES)[number];

const optionalInt = (max: number, message: string) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= max), message);

const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : new Date(v)))
  .refine((v) => v === null || !Number.isNaN(v.getTime()), "Enter a valid date");

/** Admin form input. Money fields are typed in major units; value converts per type. */
export const discountInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, "Code must be at least 3 characters")
      .max(32)
      .regex(/^[A-Z0-9_-]+$/, "Letters, numbers, - and _ only"),
    title: z.string().trim().min(1, "Title is required").max(120),
    type: z.enum(DISCOUNT_TYPES, "Choose a type"),
    /** "10" (%) or "250.00" (amount); ignored for FREE_SHIPPING. */
    value: z.string().trim(),
    minOrderSubtotal: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : Number(v)))
      .refine((v) => v === null || (Number.isFinite(v) && v >= 0), "Enter an amount"),
    usageLimit: optionalInt(1_000_000, "Enter a whole number"),
    usageLimitPerUser: optionalInt(1_000, "Enter a whole number"),
    stackable: z.boolean(),
    active: z.boolean(),
    startsAt: optionalDate,
    endsAt: optionalDate,
  })
  .superRefine((d, ctx) => {
    if (d.type === "PERCENTAGE" && !/^\d{1,3}(\.\d{1,2})?$/.test(d.value)) ctx.addIssue({ code: "custom", path: ["value"], message: "Enter a percentage like 10 or 12.5" });
    if (d.type === "PERCENTAGE" && Number(d.value) > 100) ctx.addIssue({ code: "custom", path: ["value"], message: "Percentage cannot exceed 100" });
    if (d.type === "FIXED_AMOUNT" && !(Number(d.value) > 0)) ctx.addIssue({ code: "custom", path: ["value"], message: "Enter an amount greater than zero" });
    if (d.startsAt && d.endsAt && d.endsAt <= d.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End must be after start" });
  });
export type DiscountInput = z.infer<typeof discountInputSchema>;

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

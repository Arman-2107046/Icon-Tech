// checkout module — public types and validation schemas.

import { z } from "zod";

const moneyInput = z
  .string()
  .trim()
  .regex(/^\d{1,9}([.,]\d{1,2})?$/, "Enter an amount like 60 or 1299.50");

const optionalMoneyInput = z.union([z.literal(""), moneyInput]).transform((v) => (v === "" ? null : v));

/** "BD, in , np" -> ["BD", "IN", "NP"]; validated as ISO 3166-1 alpha-2. */
export const countriesInputSchema = z
  .string()
  .transform((raw) =>
    Array.from(
      new Set(
        raw
          .split(/[,\s]+/)
          .map((c) => c.trim().toUpperCase())
          .filter(Boolean),
      ),
    ),
  )
  .pipe(z.array(z.string().regex(/^[A-Z]{2}$/, "Use two-letter country codes like BD or GB")).min(1, "Add at least one country"));

export const shippingZoneInputSchema = z.object({
  name: z.string().trim().min(2, "Name needs at least 2 characters").max(80),
  countries: countriesInputSchema,
});
export type ShippingZoneInput = z.infer<typeof shippingZoneInputSchema>;

export const shippingRateInputSchema = z.object({
  name: z.string().trim().min(2, "Name needs at least 2 characters").max(80),
  price: moneyInput,
  minOrderSubtotal: optionalMoneyInput,
  maxOrderSubtotal: optionalMoneyInput,
});
export type ShippingRateInput = z.infer<typeof shippingRateInputSchema>;

export const taxRateInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Use a two-letter country code like BD"),
  region: z
    .string()
    .trim()
    .max(80)
    .transform((v) => (v === "" ? null : v)),
  /** Percentage as typed, e.g. "5" or "7.5"; stored as basis points. */
  rate: z
    .string()
    .trim()
    .regex(/^\d{1,2}(\.\d{1,2})?$/, "Enter a percentage like 5 or 7.5"),
});
export type TaxRateInput = z.infer<typeof taxRateInputSchema>;

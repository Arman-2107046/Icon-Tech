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

// ---- checkout session -------------------------------------------------------

export const CHECKOUT_STEPS = ["contact", "address", "shipping", "payment"] as const;
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

export const contactSchema = z.object({
  email: z.email("Enter a valid email address").transform((v) => v.trim().toLowerCase()),
  phone: z
    .string()
    .trim()
    .min(6, "Enter a phone number the courier can call")
    .max(30)
    .regex(/^[+\d][\d\s()-]{5,}$/, "Enter a valid phone number"),
  acceptsMarketing: z.boolean().default(false),
});
export type ContactInput = z.infer<typeof contactSchema>;

/** Optional text: accepts "" or null on input (stored data is re-parsed), yields null when blank. */
const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null(), z.undefined()])
    .transform((v) => (v ? v : null));

export const addressSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  company: optionalText(80),
  line1: z.string().trim().min(3, "Enter a street address").max(160),
  line2: optionalText(160),
  city: z.string().trim().min(1, "City is required").max(80),
  region: optionalText(80),
  postalCode: optionalText(20),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Choose a country"),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const checkoutDataSchema = z.object({
  step: z.enum(CHECKOUT_STEPS).default("contact"),
  contact: contactSchema.optional(),
  shippingAddress: addressSchema.optional(),
  /** Null = same as shipping. */
  billingAddress: addressSchema.nullable().optional(),
  shippingRateId: z.string().optional(),
  discountCode: z.string().optional(),
});
export type CheckoutData = z.infer<typeof checkoutDataSchema>;

/** Countries the store ships to; the address form offers exactly these. */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "BD", name: "Bangladesh" },
  { code: "IN", name: "India" },
  { code: "NP", name: "Nepal" },
  { code: "LK", name: "Sri Lanka" },
  { code: "MY", name: "Malaysia" },
  { code: "SG", name: "Singapore" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
];

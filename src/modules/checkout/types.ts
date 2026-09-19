// checkout module — public types. Browser-safe: no zod, no server imports.

export const CHECKOUT_STEPS = ["contact", "address", "shipping", "payment"] as const;
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

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

export type { AddressInput, CheckoutData, ContactInput, ShippingRateInput, ShippingZoneInput, TaxRateInput } from "./schemas";

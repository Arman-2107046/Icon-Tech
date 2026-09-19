// discounts module — zod schemas. Browser-safe exports live in ./types.
import { z } from "zod";
import { DISCOUNT_TYPES } from "./types";

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

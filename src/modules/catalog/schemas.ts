// catalog module — zod schemas. Browser-safe exports live in ./types.

import { z } from "zod";
import { COLLECTION_TYPES, MEDIA_OWNER_TYPES, PRODUCT_STATUSES } from "./types";

export const handleSchema = z
  .string()
  .trim()
  .min(1, "Handle is required")
  .max(120, "Handle is too long")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens");

/** "audio, wireless,  anc" -> ["audio", "wireless", "anc"] */
export const tagsInputSchema = z
  .string()
  .default("")
  .transform((raw) =>
    Array.from(
      new Set(
        raw
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      ),
    ),
  );

export const productInputSchema = z.object({
  title: z.string().trim().min(2, "Title needs at least 2 characters").max(200, "Title is too long"),
  handle: handleSchema,
  description: z.string().default(""),
  status: z.enum(PRODUCT_STATUSES, { message: "Pick a status" }),
  vendor: z
    .string()
    .trim()
    .max(120)
    .transform((v) => (v === "" ? null : v)),
  tags: tagsInputSchema,
  seoTitle: z
    .string()
    .trim()
    .max(70, "Keep SEO titles under 70 characters")
    .transform((v) => (v === "" ? null : v)),
  seoDescription: z
    .string()
    .trim()
    .max(160, "Keep SEO descriptions under 160 characters")
    .transform((v) => (v === "" ? null : v)),
});

export type ProductInput = z.infer<typeof productInputSchema>;

// ---- options / variant matrix -----------------------------------------------

export const optionsInputSchema = z
  .array(
    z.object({
      id: z.string().optional(),
      name: z.string().max(60, "Option names are limited to 60 characters"),
      values: z.array(z.object({ id: z.string().optional(), value: z.string().max(80, "Values are limited to 80 characters") })),
    }),
  )
  .max(3, "A product can have at most 3 options");

export type OptionsInput = z.infer<typeof optionsInputSchema>;

/** Hard cap so a typo in the builder cannot create thousands of rows. */
// ---- variant inline edit ----------------------------------------------------

const moneyInput = z
  .string()
  .trim()
  .regex(/^\d{1,9}([.,]\d{1,2})?$/, "Enter an amount like 1299 or 1299.50");

export const variantInputSchema = z.object({
  sku: z
    .string()
    .trim()
    .max(64, "SKU is too long")
    .transform((v) => (v === "" ? null : v)),
  price: moneyInput,
  compareAtPrice: z.union([z.literal(""), moneyInput]).transform((v) => (v === "" ? null : v)),
  available: z.coerce.number().int("Stock must be a whole number").min(0, "Stock cannot be negative").max(1_000_000),
});

export type VariantInput = z.infer<typeof variantInputSchema>;

// ---- media ------------------------------------------------------------------

export const mediaMetaSchema = z.object({
  ownerType: z.enum(MEDIA_OWNER_TYPES),
  ownerId: z.string().min(1),
  width: z.coerce.number().int().min(1).max(20000),
  height: z.coerce.number().int().min(1).max(20000),
  blurhash: z
    .string()
    .trim()
    .min(6)
    .max(120)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  alt: z.string().trim().max(200).default(""),
});

export const mediaAltSchema = z.object({ alt: z.string().trim().max(200, "Alt text is limited to 200 characters") });

// ---- collections ------------------------------------------------------------

export const collectionInputSchema = z.object({
  title: z.string().trim().min(2, "Title needs at least 2 characters").max(120),
  handle: handleSchema,
  description: z.string().default(""),
  type: z.enum(COLLECTION_TYPES, { message: "Pick a type" }),
  seoTitle: z
    .string()
    .trim()
    .max(70, "Keep SEO titles under 70 characters")
    .transform((v) => (v === "" ? null : v)),
  seoDescription: z
    .string()
    .trim()
    .max(160, "Keep SEO descriptions under 160 characters")
    .transform((v) => (v === "" ? null : v)),
});

export type CollectionInput = z.infer<typeof collectionInputSchema>;

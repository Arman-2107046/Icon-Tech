// catalog module — public types and validation schemas.

import { z } from "zod";

export const PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;

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

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

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
export const MAX_VARIANTS = 100;

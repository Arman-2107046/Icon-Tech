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
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

// content module — public types and validation schemas.

import { z } from "zod";

export const handleSchema = z
  .string()
  .trim()
  .min(1, "Handle is required")
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens");

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export const pageInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  handle: handleSchema,
  body: z.string().default(""),
  published: z.boolean(),
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
export type PageInput = z.infer<typeof pageInputSchema>;

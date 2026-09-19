// content module — zod schemas. Browser-safe exports live in ./types.

import { z } from "zod";
import { HOMEPAGE_SECTION_TYPES } from "./types";

export const handleSchema = z
  .string()
  .trim()
  .min(1, "Handle is required")
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens");

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

// ---- menus ------------------------------------------------------------------

export const menuInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(80),
  handle: handleSchema,
});
export type MenuInput = z.infer<typeof menuInputSchema>;

export const menuItemInputSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(80),
  url: z
    .string()
    .trim()
    .min(1, "URL is required")
    .max(500)
    .refine((v) => /^(\/|https?:\/\/|mailto:|tel:)/.test(v), "Use a path like /collections/audio or a full URL"),
  parentId: z
    .string()
    .trim()
    .transform((v) => (v === "" || v === "__root__" ? null : v)),
});
export type MenuItemInput = z.infer<typeof menuItemInputSchema>;

// ---- site settings ----------------------------------------------------------

const optionalUrl = z.union([z.literal(""), z.url("Enter a full URL")]).transform((v) => (v === "" ? null : v));

export const homepageSectionSchema = z.object({
  type: z.enum(HOMEPAGE_SECTION_TYPES),
  enabled: z.boolean().default(true),
  collection: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(24).optional(),
});
export type HomepageSection = z.infer<typeof homepageSectionSchema>;

export const siteSettingsSchema = z.object({
  store: z.object({
    name: z.string().trim().min(1, "Store name is required").max(80).default("Icon Tech"),
    tagline: z.string().trim().max(160).default(""),
    email: z.union([z.literal(""), z.email("Enter a valid email")]).default(""),
    phone: z.string().trim().max(40).default(""),
    address: z.string().trim().max(300).default(""),
  }),
  social: z
    .object({
      instagram: optionalUrl.default(null),
      facebook: optionalUrl.default(null),
      youtube: optionalUrl.default(null),
    })
    .default({ instagram: null, facebook: null, youtube: null }),
  email: z
    .object({
      fromName: z.string().trim().max(80).default("Icon Tech"),
      fromAddress: z.union([z.literal(""), z.email("Enter a valid email")]).default(""),
    })
    .default({ fromName: "Icon Tech", fromAddress: "" }),
  homepage: z.object({ sections: z.array(homepageSectionSchema).max(12) }).default({ sections: [] }),
  checkout: z
    .object({
      /** Minor units. Null disables the free-shipping banner. */
      freeShippingThreshold: z.number().int().min(0).nullable().default(null),
      codEnabled: z.boolean().default(true),
    })
    .default({ freeShippingThreshold: null, codEnabled: true }),
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const DEFAULT_SITE_SETTINGS: SiteSettings = siteSettingsSchema.parse({
  store: { name: "Icon Tech" },
  homepage: {
    sections: [
      { type: "hero", enabled: true },
      { type: "featured-collection", enabled: true, limit: 8 },
      { type: "newsletter", enabled: true },
    ],
  },
});

// content module — public types. Browser-safe: no zod, no server imports.

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

// ---- site settings ----------------------------------------------------------

export const HOMEPAGE_SECTION_TYPES = ["hero", "featured-collection", "editorial", "testimonials", "logo-row", "newsletter"] as const;
export type HomepageSectionType = (typeof HOMEPAGE_SECTION_TYPES)[number];

export const SECTION_LABELS: Record<HomepageSectionType, string> = {
  hero: "Hero",
  "featured-collection": "Featured collection",
  editorial: "Editorial image + text",
  testimonials: "Testimonials",
  "logo-row": "Logo row",
  newsletter: "Newsletter",
};

/** Sections that show products from a collection. */
export const SECTION_USES_COLLECTION: Record<HomepageSectionType, boolean> = {
  hero: true,
  "featured-collection": true,
  editorial: true,
  testimonials: false,
  "logo-row": false,
  newsletter: false,
};

export type { HomepageSection, MenuInput, MenuItemInput, PageInput, SiteSettings } from "./schemas";

// ---- storefront (browser-safe) ---------------------------------------------

export type MenuItemNode = { id: string; label: string; url: string; parentId: string | null; position: number };
export type StorefrontMenu = { id: string; handle: string; title: string; items: (MenuItemNode & { children: MenuItemNode[] })[] };

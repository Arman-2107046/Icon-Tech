// catalog module — public types. Browser-safe: no zod, no server imports.

export const PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export const MAX_VARIANTS = 100;

export const MEDIA_OWNER_TYPES = ["PRODUCT", "VARIANT", "COLLECTION", "PAGE"] as const;

export const COLLECTION_TYPES = ["MANUAL", "RULE"] as const;

export type { CollectionInput, OptionsInput, ProductInput, VariantInput } from "./schemas";

export * from "./rule-defs";
export type { CollectionRules, RuleCondition } from "./rules";
export * from "./collection-query";
export * from "./product-view";

// ---- CSV import (browser-safe summary for the admin UI) ----------------------
export type ImportIssue = { line: number; message: string };
export type ImportSummary = { dryRun: boolean; productsCreated: number; productsUpdated: number; variantsCreated: number; variantsUpdated: number; issues: ImportIssue[] };

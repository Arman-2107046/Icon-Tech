// Browser-safe view model for the product page and the pure selection
// logic behind the variant picker. Unit-tested.

export type ViewMedia = { id: string; url: string; alt: string; width: number; height: number; blurhash: string | null };

export type ViewVariant = {
  id: string;
  title: string;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  /** Units that can be sold right now (available - reserved, floored at 0). */
  sellable: number;
  /** Option name -> value for this variant. */
  selection: Record<string, string>;
  media: ViewMedia[];
};

export type ViewOption = { name: string; values: string[] };

export type ProductView = {
  id: string;
  handle: string;
  title: string;
  vendor: string | null;
  descriptionHtml: string;
  options: ViewOption[];
  variants: ViewVariant[];
  media: ViewMedia[];
};

/** Variant matching a full selection, if any. */
export function findVariant(variants: ViewVariant[], selection: Record<string, string>): ViewVariant | null {
  return variants.find((v) => Object.entries(selection).every(([k, val]) => v.selection[k] === val) && Object.keys(v.selection).length === Object.keys(selection).length) ?? null;
}

/**
 * Whether choosing `value` for `option` — keeping every other currently
 * selected value — leads to at least one purchasable variant. Drives the
 * struck-through state: values are never hidden, only disabled.
 */
export function isValueAvailable(variants: ViewVariant[], selection: Record<string, string>, option: string, value: string): boolean {
  const others = Object.entries(selection).filter(([k]) => k !== option);
  return variants.some((v) => v.selection[option] === value && v.sellable > 0 && others.every(([k, val]) => v.selection[k] === val));
}

/** Initial selection: the requested variant if purchasable, else the first purchasable, else the first. */
export function initialSelection(variants: ViewVariant[], requestedVariantId: string | null): Record<string, string> {
  const requested = requestedVariantId ? variants.find((v) => v.id === requestedVariantId) : undefined;
  const pick = requested ?? variants.find((v) => v.sellable > 0) ?? variants[0];
  return pick ? { ...pick.selection } : {};
}

export function stockLabel(sellable: number): { text: string; tone: "success" | "danger" | "neutral" } {
  if (sellable <= 0) return { text: "Sold out", tone: "danger" };
  if (sellable <= 5) return { text: `Only ${sellable} left`, tone: "neutral" };
  return { text: "In stock", tone: "success" };
}

// Pure parsing of collection page URL state. Browser-safe; unit-tested.

export const COLLECTION_SORTS = ["featured", "newest", "price-asc", "price-desc", "title"] as const;
export type CollectionSort = (typeof COLLECTION_SORTS)[number];

export const SORT_LABELS: Record<CollectionSort, string> = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  title: "Name",
};

export const COLLECTION_PAGE_SIZE = 24;

/** Reserved query keys; anything else is treated as an option-name filter. */
const RESERVED = new Set(["sort", "page", "min", "max", "tag", "stock", "q"]);

export type CollectionQuery = {
  sort: CollectionSort;
  page: number;
  /** Major units as typed, converted to minor by the query layer. */
  minPrice: number | null;
  maxPrice: number | null;
  tags: string[];
  inStockOnly: boolean;
  /** Option name -> selected values, e.g. { Colour: ["Black", "Sand"] }. */
  options: Record<string, string[]>;
};

type Raw = Record<string, string | string[] | undefined>;

function list(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  return (Array.isArray(v) ? v : [v]).flatMap((s) => s.split(",")).map((s) => s.trim()).filter(Boolean);
}

function num(v: string | string[] | undefined): number | null {
  const first = Array.isArray(v) ? v[0] : v;
  if (!first) return null;
  const n = Number(first.replace(/,/g, ""));
  // Prices are stored as int4 minor units; clamp so a silly URL cannot overflow the query.
  return Number.isFinite(n) && n >= 0 ? Math.min(n, MAX_PRICE_MAJOR) : null;
}
const MAX_PRICE_MAJOR = 10_000_000;

export function parseCollectionQuery(raw: Raw): CollectionQuery {
  const sortRaw = Array.isArray(raw.sort) ? raw.sort[0] : raw.sort;
  const sort = (COLLECTION_SORTS as readonly string[]).includes(sortRaw ?? "") ? (sortRaw as CollectionSort) : "featured";
  const pageRaw = Number.parseInt((Array.isArray(raw.page) ? raw.page[0] : raw.page) ?? "1", 10);
  const options: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (RESERVED.has(key)) continue;
    const values = list(value);
    if (values.length) options[key] = values;
  }
  let minPrice = num(raw.min);
  let maxPrice = num(raw.max);
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice];
  return {
    sort,
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
    minPrice,
    maxPrice,
    tags: list(raw.tag).map((t) => t.toLowerCase()),
    inStockOnly: (Array.isArray(raw.stock) ? raw.stock[0] : raw.stock) === "in",
    options,
  };
}

export function hasActiveFilters(q: CollectionQuery): boolean {
  return q.minPrice !== null || q.maxPrice !== null || q.tags.length > 0 || q.inStockOnly || Object.keys(q.options).length > 0;
}

/** Serialise back to a query string (page omitted when 1, sort omitted when featured). */
export function collectionQueryToParams(q: CollectionQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (q.sort !== "featured") params.set("sort", q.sort);
  if (q.page > 1) params.set("page", String(q.page));
  if (q.minPrice !== null) params.set("min", String(q.minPrice));
  if (q.maxPrice !== null) params.set("max", String(q.maxPrice));
  for (const t of q.tags) params.append("tag", t);
  if (q.inStockOnly) params.set("stock", "in");
  for (const [name, values] of Object.entries(q.options)) for (const v of values) params.append(name, v);
  return params;
}

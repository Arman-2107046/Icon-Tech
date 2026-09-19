import "server-only";

import { Prisma } from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";
import { listStorefrontProductCards, type ProductCard } from "./storefront";

export const SEARCH_PAGE_SIZE = 24;

export type SearchResult = { products: ProductCard[]; total: number; page: number; pageCount: number; mode: "fulltext" | "fuzzy" | "none" };

type Hit = { id: string; rank: number };

/**
 * Product search: weighted full-text match (title > vendor/tags > description)
 * ranked by ts_rank; when nothing matches, a trigram word-similarity pass
 * on titles catches typos ("keybord"). Only `$queryRaw` tagged templates
 * are used, so every value is a bound parameter.
 */
export async function searchProducts(query: string, page = 1, pageSize = SEARCH_PAGE_SIZE): Promise<SearchResult> {
  const q = query.trim().slice(0, 100);
  if (!q) return { products: [], total: 0, page: 1, pageCount: 1, mode: "none" };

  let hits = await db.$queryRaw<Hit[]>(Prisma.sql`
    SELECT id, ts_rank(search, websearch_to_tsquery('english', ${q})) AS rank
    FROM products
    WHERE status = 'ACTIVE' AND search @@ websearch_to_tsquery('english', ${q})
    ORDER BY rank DESC, created_at DESC
  `);
  let mode: SearchResult["mode"] = "fulltext";

  if (hits.length === 0) {
    hits = await db.$queryRaw<Hit[]>(Prisma.sql`
      SELECT id, word_similarity(${q}, title) AS rank
      FROM products
      WHERE status = 'ACTIVE' AND ${q} <% title
      ORDER BY rank DESC, created_at DESC
    `);
    mode = hits.length ? "fuzzy" : "none";
  }

  const total = hits.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const ids = hits.slice((current - 1) * pageSize, current * pageSize).map((h) => h.id);
  const cards = ids.length ? await listStorefrontProductCards({ id: { in: ids } }, ids.length) : [];
  const byId = new Map(cards.map((c) => [c.id, c]));
  return { products: ids.flatMap((id) => byId.get(id) ?? []), total, page: current, pageCount, mode };
}

/** Compact hits for the instant-results dropdown. */
export async function quickSearch(query: string, limit = 6): Promise<ProductCard[]> {
  const result = await searchProducts(query, 1, limit);
  return result.products;
}

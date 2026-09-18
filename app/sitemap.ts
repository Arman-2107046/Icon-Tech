import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/src/lib/db";
import { tags } from "@/src/lib/cache-tags";
import { absoluteUrl } from "@/src/lib/site";

async function entries(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("hours");
  cacheTag(tags.products, tags.collections, tags.pages);
  const [products, collections, pages] = await Promise.all([
    db.product.findMany({ where: { status: "ACTIVE" }, select: { handle: true, updatedAt: true } }),
    db.collection.findMany({ select: { handle: true, updatedAt: true } }),
    db.page.findMany({ where: { publishedAt: { not: null } }, select: { handle: true, updatedAt: true } }),
  ]);
  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    ...collections.map((c) => ({ url: absoluteUrl(`/collections/${c.handle}`), lastModified: c.updatedAt, changeFrequency: "daily" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: absoluteUrl(`/products/${p.handle}`), lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...pages.map((p) => ({ url: absoluteUrl(`/pages/${p.handle}`), lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.4 })),
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return entries();
}

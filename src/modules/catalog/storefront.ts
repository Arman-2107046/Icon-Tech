// catalog module — cached storefront reads. Every function is `use cache`
// and tagged so the admin actions can expire exactly what changed.

import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/src/generated/prisma/client";
import { blurDataUrl } from "@/src/lib/blur";
import { db } from "@/src/lib/db";
import { tags } from "@/src/lib/cache-tags";
import { COLLECTION_PAGE_SIZE, type CollectionQuery } from "./collection-query";
import { collectionMembershipWhere } from "./queries";

/** Product page data: active product with options, variants, stock, media. */
export async function getStorefrontProduct(handle: string) {
  "use cache";
  cacheLife("max");
  cacheTag(tags.productHandle(handle), tags.products);

  const product = await db.product.findFirst({
    where: { handle, status: "ACTIVE" },
    include: {
      options: { orderBy: { position: "asc" }, include: { values: { orderBy: { position: "asc" } } } },
      variants: {
        orderBy: { position: "asc" },
        include: { inventory: { select: { available: true, reserved: true } }, optionValues: { select: { optionValueId: true } } },
      },
    },
  });
  if (!product) return null;
  cacheTag(tags.product(product.id));
  const [media, variantMedia] = await Promise.all([
    db.media.findMany({ where: { ownerType: "PRODUCT", ownerId: product.id }, orderBy: { position: "asc" } }),
    db.media.findMany({ where: { ownerType: "VARIANT", ownerId: { in: product.variants.map((v) => v.id) } }, orderBy: { position: "asc" } }),
  ]);
  return { ...product, media, variantMedia };
}

export type StorefrontProduct = NonNullable<Awaited<ReturnType<typeof getStorefrontProduct>>>;

/** Card data for product grids: title, handle, price range, cover image, stock. */
export async function listStorefrontProductCards(where: Prisma.ProductWhereInput, take = 48) {
  "use cache";
  cacheLife("max");
  cacheTag(tags.products);

  const products = await db.product.findMany({
    where: { ...where, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      handle: true,
      title: true,
      vendor: true,
      tags: true,
      variants: { select: { price: true, compareAtPrice: true, inventory: { select: { available: true, reserved: true } } } },
    },
  });
  const media = await db.media.findMany({
    where: { ownerType: "PRODUCT", ownerId: { in: products.map((p) => p.id) }, position: { lte: 1 } },
    orderBy: { position: "asc" },
    select: { ownerId: true, url: true, width: true, height: true, blurhash: true, alt: true, position: true },
  });
  return products.map((p) => {
    const prices = p.variants.map((v) => v.price);
    const images = media.filter((m) => m.ownerId === p.id);
    return {
      id: p.id,
      handle: p.handle,
      title: p.title,
      vendor: p.vendor,
      tags: p.tags,
      priceMin: prices.length ? Math.min(...prices) : 0,
      priceMax: prices.length ? Math.max(...prices) : 0,
      compareAt: p.variants.find((v) => v.compareAtPrice)?.compareAtPrice ?? null,
      inStock: p.variants.some((v) => (v.inventory?.available ?? 0) - (v.inventory?.reserved ?? 0) > 0),
      image: images[0] ? { ...images[0], blur: blurDataUrl(images[0].blurhash) } : null,
      hoverImage: images[1] ? { ...images[1], blur: blurDataUrl(images[1].blurhash) } : null,
    };
  });
}

export type ProductCard = Awaited<ReturnType<typeof listStorefrontProductCards>>[number];

/** Collection header + its member product cards (manual order or rule match). */
export async function getStorefrontCollection(handle: string) {
  "use cache";
  cacheLife("max");
  cacheTag(tags.collection(handle), tags.collections);

  const collection = await db.collection.findUnique({ where: { handle } });
  if (!collection) return null;
  const membership = collectionMembershipWhere(collection);
  const image = await db.media.findFirst({ where: { ownerType: "COLLECTION", ownerId: collection.id }, orderBy: { position: "asc" } });
  return { ...collection, membership, image: image ? { ...image, blur: blurDataUrl(image.blurhash) } : null };
}

export async function listStorefrontCollections() {
  "use cache";
  cacheLife("max");
  cacheTag(tags.collections);
  return db.collection.findMany({ orderBy: { title: "asc" }, select: { id: true, handle: true, title: true, description: true, imageUrl: true, type: true } });
}

// ---- collection page: facets + filtered listing --------------------------

export type CollectionFacets = {
  priceMin: number;
  priceMax: number;
  options: { name: string; values: string[] }[];
  tags: string[];
};

/** Filter options available inside a collection, from its ACTIVE members. */
export async function getCollectionFacets(membership: Prisma.ProductWhereInput): Promise<CollectionFacets> {
  "use cache";
  cacheLife("max");
  cacheTag(tags.products, tags.collections);

  const products = await db.product.findMany({
    where: { AND: [membership, { status: "ACTIVE" }] },
    select: {
      tags: true,
      variants: { select: { price: true } },
      options: { select: { name: true, values: { select: { value: true } } } },
    },
  });
  const prices = products.flatMap((p) => p.variants.map((v) => v.price));
  const optionValues = new Map<string, Set<string>>();
  const tagSet = new Set<string>();
  for (const p of products) {
    for (const t of p.tags) tagSet.add(t);
    for (const o of p.options) {
      const set = optionValues.get(o.name) ?? new Set<string>();
      for (const v of o.values) set.add(v.value);
      optionValues.set(o.name, set);
    }
  }
  return {
    priceMin: prices.length ? Math.min(...prices) : 0,
    priceMax: prices.length ? Math.max(...prices) : 0,
    options: [...optionValues.entries()].filter(([, v]) => v.size > 1).map(([name, v]) => ({ name, values: [...v].sort() })),
    tags: [...tagSet].sort(),
  };
}

export type CollectionListing = { products: ProductCard[]; total: number; page: number; pageCount: number };

/**
 * Filtered, sorted, paginated cards for a collection. Sorting by price and
 * manual position happens in memory because neither is a column on the
 * product row; collections are small enough for that to be cheap.
 */
export async function listCollectionProducts(
  membership: Prisma.ProductWhereInput,
  query: CollectionQuery,
  manualOrder: string[] | null,
  pageSize = COLLECTION_PAGE_SIZE,
): Promise<CollectionListing> {
  "use cache";
  cacheLife("max");
  cacheTag(tags.products, tags.collections);

  const and: Prisma.ProductWhereInput[] = [membership, { status: "ACTIVE" }];
  if (query.minPrice !== null || query.maxPrice !== null) {
    and.push({
      variants: {
        some: {
          price: {
            ...(query.minPrice !== null ? { gte: Math.round(query.minPrice * 100) } : {}),
            ...(query.maxPrice !== null ? { lte: Math.round(query.maxPrice * 100) } : {}),
          },
        },
      },
    });
  }
  if (query.tags.length) and.push({ tags: { hasSome: query.tags } });
  if (query.inStockOnly) and.push({ variants: { some: { inventory: { available: { gt: 0 } } } } });
  for (const [name, values] of Object.entries(query.options)) {
    and.push({ variants: { some: { optionValues: { some: { optionValue: { value: { in: values }, option: { name } } } } } } });
  }

  const matches = await db.product.findMany({
    where: { AND: and },
    select: { id: true, title: true, createdAt: true, variants: { select: { price: true } } },
  });

  const position = new Map((manualOrder ?? []).map((id, i) => [id, i]));
  const minPrice = (p: (typeof matches)[number]) => (p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : 0);
  const sorted = [...matches].sort((a, b) => {
    switch (query.sort) {
      case "price-asc":
        return minPrice(a) - minPrice(b);
      case "price-desc":
        return minPrice(b) - minPrice(a);
      case "title":
        return a.title.localeCompare(b.title);
      case "newest":
        return b.createdAt.getTime() - a.createdAt.getTime();
      case "featured":
      default:
        if (manualOrder) return (position.get(a.id) ?? Infinity) - (position.get(b.id) ?? Infinity);
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(query.page, pageCount);
  const ids = sorted.slice((page - 1) * pageSize, page * pageSize).map((p) => p.id);
  const cards = await listStorefrontProductCards({ id: { in: ids } }, ids.length || 1);
  const byId = new Map(cards.map((c) => [c.id, c]));
  return { products: ids.flatMap((id) => byId.get(id) ?? []), total, page, pageCount };
}

/** Ordered product ids for a manual collection (null for rule collections). */
export async function getManualOrder(collectionId: string, type: "MANUAL" | "RULE"): Promise<string[] | null> {
  "use cache";
  cacheLife("max");
  cacheTag(tags.collections);
  if (type !== "MANUAL") return null;
  const rows = await db.collectionProduct.findMany({ where: { collectionId }, orderBy: { position: "asc" }, select: { productId: true } });
  return rows.map((r) => r.productId);
}

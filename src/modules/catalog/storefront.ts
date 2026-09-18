// catalog module — cached storefront reads. Every function is `use cache`
// and tagged so the admin actions can expire exactly what changed.

import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";
import { tags } from "@/src/lib/cache-tags";
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
  const media = await db.media.findMany({ where: { ownerType: "PRODUCT", ownerId: product.id }, orderBy: { position: "asc" } });
  return { ...product, media };
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
      image: images[0] ?? null,
      hoverImage: images[1] ?? null,
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
  return { ...collection, membership, image };
}

export async function listStorefrontCollections() {
  "use cache";
  cacheLife("max");
  cacheTag(tags.collections);
  return db.collection.findMany({ orderBy: { title: "asc" }, select: { id: true, handle: true, title: true, description: true, imageUrl: true, type: true } });
}

// catalog module — read-side queries. Server only; imported via ./index.ts.

import "server-only";

import type { Prisma } from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";
import type { ProductStatus } from "@/src/generated/prisma/enums";

// ---- admin: products list ----------------------------------------------------

export type AdminProductListParams = {
  q: string;
  status?: ProductStatus;
  collectionHandle?: string;
  sort: "title" | "updatedAt" | "createdAt" | "status";
  dir: "asc" | "desc";
  skip: number;
  take: number;
};

export type AdminProductRow = {
  id: string;
  handle: string;
  title: string;
  status: ProductStatus;
  vendor: string | null;
  updatedAt: Date;
  variantCount: number;
  inventory: number;
  priceMin: number;
  priceMax: number;
  imageUrl: string | null;
};

export async function listProductsForAdmin(params: AdminProductListParams): Promise<{ rows: AdminProductRow[]; total: number }> {
  const where: Prisma.ProductWhereInput = {
    ...(params.q
      ? {
          OR: [
            { title: { contains: params.q, mode: "insensitive" } },
            { handle: { contains: params.q, mode: "insensitive" } },
            { vendor: { contains: params.q, mode: "insensitive" } },
            { variants: { some: { sku: { contains: params.q, mode: "insensitive" } } } },
          ],
        }
      : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.collectionHandle ? { collections: { some: { collection: { handle: params.collectionHandle } } } } : {}),
  };

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { [params.sort]: params.dir },
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
        handle: true,
        title: true,
        status: true,
        vendor: true,
        updatedAt: true,
        variants: { select: { price: true, inventory: { select: { available: true } } } },
      },
    }),
    db.product.count({ where }),
  ]);

  const media = await db.media.findMany({
    where: { ownerType: "PRODUCT", ownerId: { in: products.map((p) => p.id) }, position: 0 },
    select: { ownerId: true, url: true },
  });
  const imageByProduct = new Map(media.map((m) => [m.ownerId, m.url]));

  const rows: AdminProductRow[] = products.map((p) => {
    const prices = p.variants.map((v) => v.price);
    return {
      id: p.id,
      handle: p.handle,
      title: p.title,
      status: p.status,
      vendor: p.vendor,
      updatedAt: p.updatedAt,
      variantCount: p.variants.length,
      inventory: p.variants.reduce((sum, v) => sum + (v.inventory?.available ?? 0), 0),
      priceMin: prices.length ? Math.min(...prices) : 0,
      priceMax: prices.length ? Math.max(...prices) : 0,
      imageUrl: imageByProduct.get(p.id) ?? null,
    };
  });

  return { rows, total };
}

/** Handles + titles for filter dropdowns and pickers. */
export async function listCollectionsBrief(): Promise<{ id: string; handle: string; title: string; type: "MANUAL" | "RULE" }[]> {
  return db.collection.findMany({
    orderBy: { title: "asc" },
    select: { id: true, handle: true, title: true, type: true },
  });
}

// ---- admin: product detail ---------------------------------------------------

export async function getProductForAdmin(id: string) {
  return db.product.findUnique({
    where: { id },
    include: {
      options: { orderBy: { position: "asc" }, include: { values: { orderBy: { position: "asc" } } } },
      variants: {
        orderBy: { position: "asc" },
        include: { inventory: true, optionValues: { select: { optionValueId: true } } },
      },
    },
  });
}

export type AdminProduct = NonNullable<Awaited<ReturnType<typeof getProductForAdmin>>>;

// ---- media ------------------------------------------------------------------

export async function listMedia(ownerType: "PRODUCT" | "VARIANT" | "COLLECTION" | "PAGE", ownerId: string) {
  return db.media.findMany({ where: { ownerType, ownerId }, orderBy: { position: "asc" } });
}

export type MediaItem = Awaited<ReturnType<typeof listMedia>>[number];

/**
 * Cache tags used by `cacheTag()` in cached reads and `updateTag()` /
 * `revalidateTag()` in the actions that change the underlying rows. Every
 * tag is built here so reads and writes cannot drift apart.
 *
 * Granularity: one tag per entity plus one per list. A product edit
 * invalidates its own tag and the product lists; rule-based collections
 * derive from product data, so product changes also invalidate every
 * collection tag.
 */
export const tags = {
  products: "products",
  product: (id: string) => `product:${id}`,
  productHandle: (handle: string) => `product-handle:${handle}`,
  collections: "collections",
  collection: (handle: string) => `collection:${handle}`,
  settings: "settings",
  menus: "menus",
  menu: (handle: string) => `menu:${handle}`,
  pages: "pages",
  page: (handle: string) => `page:${handle}`,
  shipping: "shipping",
} as const;

/** Tags to expire when a product (or its variants/media/options) changes. */
export function productChangedTags(product: { id: string; handle: string }): string[] {
  return [tags.product(product.id), tags.productHandle(product.handle), tags.products, tags.collections];
}

/** Tags to expire when a collection's definition or membership changes. */
export function collectionChangedTags(handle: string): string[] {
  return [tags.collection(handle), tags.collections];
}

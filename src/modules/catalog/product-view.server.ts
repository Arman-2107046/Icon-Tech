import "server-only";

import { renderMarkdown } from "@/src/lib/markdown";
import type { ProductView, ViewMedia } from "./product-view";
import type { StorefrontProduct } from "./storefront";

function toMedia(m: { id: string; url: string; alt: string; width: number; height: number; blurhash: string | null }): ViewMedia {
  return { id: m.id, url: m.url, alt: m.alt, width: m.width, height: m.height, blurhash: m.blurhash };
}

export function toProductView(product: StorefrontProduct): ProductView {
  const valueLookup = new Map(product.options.flatMap((o) => o.values.map((v) => [v.id, { name: o.name, value: v.value }] as const)));
  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    vendor: product.vendor,
    descriptionHtml: renderMarkdown(product.description),
    options: product.options.map((o) => ({ name: o.name, values: o.values.map((v) => v.value) })),
    variants: product.variants.map((v) => ({
      id: v.id,
      title: v.title,
      sku: v.sku,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      sellable: Math.max(0, (v.inventory?.available ?? 0) - (v.inventory?.reserved ?? 0)),
      selection: Object.fromEntries(
        v.optionValues.flatMap((ov) => {
          const hit = valueLookup.get(ov.optionValueId);
          return hit ? [[hit.name, hit.value]] : [];
        }),
      ),
      media: product.variantMedia.filter((m) => m.ownerId === v.id).map(toMedia),
    })),
    media: product.media.map(toMedia),
  };
}

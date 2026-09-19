// Seeds 40 products with genuine variant structures. Filled in by item 25.

import { blurhashFromUrl } from "../../src/lib/blurhash-from-url";
import { db } from "../../src/lib/db";
import { PRODUCTS, type SeedProduct } from "./data/products";
import { bdt, cartesian, imageUrl, int, rng } from "./util";

const VENDOR_PREFIX: Record<string, string> = {
  "Aria Audio": "ARA",
  Monolith: "MON",
  Fieldline: "FLD",
  Keystone: "KEY",
  Glide: "GLD",
  Volt: "VLT",
  Shell: "SHL",
  Porter: "PTR",
  Plinth: "PLN",
  Tempo: "TMP",
};

/** "Midnight Blue" -> "MB", "20,000 mAh" -> "20", '13"' -> "13". */
function valueCode(value: string): string {
  const words = value.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/);
  if (words.length === 1) {
    const word = words[0] ?? "";
    return /^\d/.test(word) ? word.slice(0, 3).toUpperCase() : word.slice(0, 2).toUpperCase();
  }
  return words
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 3);
}

/**
 * PREFIX-MODEL-CODES, e.g. VLT-015-65W. Abbreviations can collide
 * ("iPhone 16 Pro" / "iPhone 16 Pro Max"), so a numeric suffix is added
 * when a code is already used within the product.
 */
function variantSku(product: SeedProduct, index: number, values: string[], used: Set<string>): string {
  const prefix = VENDOR_PREFIX[product.vendor] ?? "ICN";
  const model = String(index + 1).padStart(3, "0");
  const base = [prefix, model, ...values.map(valueCode)].join("-");
  let sku = base;
  for (let n = 2; used.has(sku); n++) sku = `${base}-${n}`;
  used.add(sku);
  return sku;
}

async function seedProduct(product: SeedProduct, index: number, random: () => number): Promise<void> {
  const created = await db.product.create({
    data: {
      handle: product.handle,
      title: product.title,
      description: product.description,
      status: product.status ?? "ACTIVE",
      vendor: product.vendor,
      tags: product.tags,
      seoTitle: `${product.title} | Icon Tech`,
      seoDescription: product.description.split(". ")[0] + ".",
      options: {
        create: product.options.map((option, oi) => ({
          name: option.name,
          position: oi,
          values: {
            create: option.values.map((value, vi) => ({ value, position: vi })),
          },
        })),
      },
    },
    include: { options: { include: { values: true } } },
  });

  // Look up option-value ids by (option name, value) for the matrix.
  const valueId = new Map<string, string>();
  for (const option of created.options) {
    for (const v of option.values) valueId.set(`${option.name}::${v.value}`, v.id);
  }

  const combos = cartesian(product.options.map((o) => o.values));
  const delta = product.priceDelta ?? {};
  const usedSkus = new Set<string>();

  for (const [ci, values] of combos.entries()) {
    const surcharge = values.reduce((sum, v) => sum + (delta[v] ?? 0), 0);
    const price = bdt(product.price + surcharge);
    const compareAt = product.compareAt ? bdt(product.compareAt + surcharge) : null;
    const cost = Math.round(price * (0.52 + random() * 0.12));

    // Stock: most variants healthy, some low, a few sold out.
    const roll = random();
    const available = roll < 0.08 ? 0 : roll < 0.25 ? int(random, 1, 5) : int(random, 8, 60);

    await db.variant.create({
      data: {
        productId: created.id,
        title: values.join(" / "),
        sku: variantSku(product, index, values, usedSkus),
        barcode: `880${String(index).padStart(3, "0")}${String(ci).padStart(4, "0")}`,
        price,
        compareAtPrice: compareAt,
        cost,
        weightGrams: product.weightGrams ?? null,
        position: ci,
        optionValues: {
          create: values.map((v, vi) => {
            const optionName = product.options[vi]?.name ?? "";
            const id = valueId.get(`${optionName}::${v}`);
            if (!id) throw new Error(`seed: missing option value ${optionName}=${v}`);
            return { optionValueId: id };
          }),
        },
        inventory: { create: { available, reserved: 0 } },
      },
    });
  }

  const imageCount = product.images ?? 3;
  const urls = Array.from({ length: imageCount }, (_, i) => imageUrl(`${product.handle}-${i + 1}`));
  // Real placeholders for the storefront (skipped silently when offline).
  const hashes = await Promise.all(urls.map((u) => blurhashFromUrl(u)));
  await db.media.createMany({
    data: urls.map((url, i) => ({
      ownerType: "PRODUCT" as const,
      ownerId: created.id,
      url,
      mimeType: "image/jpeg",
      width: 1200,
      height: 1500,
      blurhash: hashes[i] ?? null,
      alt: i === 0 ? product.title : `${product.title}, view ${i + 1}`,
      position: i,
    })),
  });
}

export async function seedCatalog(): Promise<void> {
  const random = rng(25);
  for (const [index, product] of PRODUCTS.entries()) {
    await seedProduct(product, index, random);
  }
}

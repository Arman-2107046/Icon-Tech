"use server";

// catalog module — Server Actions. Every action returns an ActionResult; never throws.

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionResult, fail, failFromZod, ok, runAction } from "@/src/lib/action-result";
import { assertAdmin } from "@/src/lib/auth/guards";
import { db } from "@/src/lib/db";
import { collectionChangedTags, productChangedTags, tags } from "@/src/lib/cache-tags";
import { isUniqueViolation } from "@/src/lib/db-errors";
import { cleanOptions, combinations, planVariants } from "./matrix";
import { fromMajorUnits } from "@/src/lib/money";
import { deleteUpload } from "@/src/lib/storage";
import { coverImagesFor, previewRules, searchProductsBrief } from "./queries";
import { quickSearch } from "./search";
import { collectionRulesSchema } from "./rules";
import { collectionInputSchema, mediaAltSchema, optionsInputSchema, productInputSchema, variantInputSchema } from "./schemas";
import { MAX_VARIANTS, slugify } from "./types";

function expire(list: string[]): void {
  for (const tag of list) updateTag(tag);
}

/** Expire a product's tags by id (looks up the handle for the handle tag). */
async function expireProduct(productId: string, previousHandle?: string): Promise<void> {
  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true, handle: true } });
  if (product) expire(productChangedTags(product));
  if (previousHandle) updateTag(tags.productHandle(previousHandle));
}

async function expireCollection(collectionId: string): Promise<void> {
  const c = await db.collection.findUnique({ where: { id: collectionId }, select: { handle: true } });
  if (c) expire(collectionChangedTags(c.handle));
}

function readProductForm(formData: FormData) {
  const title = String(formData.get("title") ?? "");
  const handleRaw = String(formData.get("handle") ?? "").trim();
  return productInputSchema.safeParse({
    title,
    handle: handleRaw === "" ? slugify(title) : handleRaw,
    description: formData.get("description") ?? "",
    status: formData.get("status"),
    vendor: formData.get("vendor") ?? "",
    tags: formData.get("tags") ?? "",
    seoTitle: formData.get("seoTitle") ?? "",
    seoDescription: formData.get("seoDescription") ?? "",
  });
}

export async function createProduct(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const result = await runAction<{ id: string }>(async () => {
    await assertAdmin();
    const parsed = readProductForm(formData);
    if (!parsed.success) return failFromZod(parsed.error);
    try {
      const product = await db.product.create({ data: parsed.data, select: { id: true, handle: true } });
      expire(productChangedTags(product));
      return ok({ id: product.id });
    } catch (error) {
      if (isUniqueViolation(error, "handle")) return fail("Please fix the highlighted fields.", { handle: "This handle is already taken" });
      throw error;
    }
  });
  if (result.ok) redirect(`/admin/products/${result.data.id}`);
  return result;
}

export async function updateProduct(id: string, _prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction<{ id: string }>(async () => {
    await assertAdmin();
    const parsed = readProductForm(formData);
    if (!parsed.success) return failFromZod(parsed.error);
    try {
      const before = await db.product.findUnique({ where: { id }, select: { handle: true } });
      await db.product.update({ where: { id }, data: parsed.data });
      await expireProduct(id, before?.handle);
      return ok({ id });
    } catch (error) {
      if (isUniqueViolation(error, "handle")) return fail("Please fix the highlighted fields.", { handle: "This handle is already taken" });
      throw error;
    }
  });
}

/** Archive rather than delete: orders reference variants by id. */
export async function archiveProduct(id: string): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    await db.product.update({ where: { id }, data: { status: "ARCHIVED" } });
    await expireProduct(id);
    return ok(null);
  });
}

// ---- options / variant matrix -----------------------------------------------

/**
 * Replace the product's option set and regenerate its variants. Variants
 * whose option-value selection still exists keep their id, price, SKU and
 * inventory; new combinations are created at the product's lowest current
 * price with zero stock; orphaned combinations are deleted.
 */
export async function saveProductOptions(productId: string, _prev: ActionResult<{ created: number; removed: number }> | null, formData: FormData): Promise<ActionResult<{ created: number; removed: number }>> {
  return runAction(async () => {
    await assertAdmin();

    let raw: unknown;
    try {
      raw = JSON.parse(String(formData.get("options") ?? "[]"));
    } catch {
      return fail("Could not read the options.");
    }
    const parsed = optionsInputSchema.safeParse(raw);
    if (!parsed.success) return failFromZod(parsed.error);
    const options = cleanOptions(parsed.data);

    const comboCount = combinations(options).length;
    if (comboCount > MAX_VARIANTS) {
      return fail(`That would create ${comboCount} variants; the limit is ${MAX_VARIANTS}.`);
    }

    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        options: { include: { values: true } },
        variants: { include: { optionValues: { include: { optionValue: { include: { option: true } } } } } },
      },
    });
    if (!product) return fail("Product not found.");

    const existing = product.variants.map((v) => ({
      data: v,
      selection: Object.fromEntries(v.optionValues.map((ov) => [ov.optionValue.option.name, ov.optionValue.value])),
    }));
    const plan = planVariants(options, existing);
    const basePrice = product.variants.length ? Math.min(...product.variants.map((v) => v.price)) : 0;

    await db.$transaction(async (tx) => {
      // 1. Rebuild the option tree. Deleting an option cascades to its values
      //    and their variant links, which is fine: links are re-created below.
      await tx.productOption.deleteMany({ where: { productId } });
      const valueIds = new Map<string, string>();
      for (const [oi, option] of options.entries()) {
        const created = await tx.productOption.create({
          data: {
            productId,
            name: option.name,
            position: oi,
            values: { create: option.values.map((v, vi) => ({ value: v.value, position: vi })) },
          },
          include: { values: true },
        });
        for (const v of created.values) valueIds.set(`${option.name}::${v.value}`, v.id);
      }

      const linksFor = (selection: Record<string, string>) =>
        Object.entries(selection).map(([name, value]) => {
          const optionValueId = valueIds.get(`${name}::${value}`);
          if (!optionValueId) throw new Error(`Missing option value ${name}=${value}`);
          return { optionValueId };
        });

      // 2. Remove orphans first so a kept variant can take a freed position.
      if (plan.remove.length) {
        await tx.variant.deleteMany({ where: { id: { in: plan.remove.map((v) => v.id) } } });
      }

      // 3. Retitle/relink survivors.
      for (const k of plan.keep) {
        await tx.variant.update({
          where: { id: k.data.id },
          data: { title: k.title, position: k.position, optionValues: { create: linksFor(k.selection) } },
        });
      }

      // 4. Create the new combinations.
      for (const c of plan.create) {
        await tx.variant.create({
          data: {
            productId,
            title: c.title,
            position: c.position,
            price: basePrice,
            optionValues: { create: linksFor(c.selection) },
            inventory: { create: { available: 0, reserved: 0 } },
          },
        });
      }
    });

    await expireProduct(productId);
    return ok({ created: plan.create.length, removed: plan.remove.length });
  });
}

// ---- variant inline edit ----------------------------------------------------

export async function updateVariant(variantId: string, _prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const parsed = variantInputSchema.safeParse({
      sku: formData.get("sku") ?? "",
      price: formData.get("price") ?? "",
      compareAtPrice: formData.get("compareAtPrice") ?? "",
      available: formData.get("available") ?? "0",
    });
    if (!parsed.success) return failFromZod(parsed.error);

    const price = fromMajorUnits(parsed.data.price).amount;
    const compareAtPrice = parsed.data.compareAtPrice ? fromMajorUnits(parsed.data.compareAtPrice).amount : null;
    if (compareAtPrice !== null && compareAtPrice <= price) {
      return fail("Please fix the highlighted fields.", { compareAtPrice: "Compare-at must be higher than the price" });
    }

    try {
      const updated = await db.variant.update({
        where: { id: variantId },
        data: {
          sku: parsed.data.sku,
          price,
          compareAtPrice,
          inventory: {
            upsert: {
              create: { available: parsed.data.available, reserved: 0 },
              update: { available: parsed.data.available },
            },
          },
        },
      });
      await expireProduct(updated.productId);
      return ok(null);
    } catch (error) {
      if (isUniqueViolation(error, "sku")) return fail("Please fix the highlighted fields.", { sku: "Another variant already uses this SKU" });
      throw error;
    }
  });
}

// ---- media ------------------------------------------------------------------

async function expireOwner(ownerType: "PRODUCT" | "VARIANT" | "COLLECTION" | "PAGE", ownerId: string): Promise<void> {
  if (ownerType === "PRODUCT") await expireProduct(ownerId);
  else if (ownerType === "COLLECTION") await expireCollection(ownerId);
  else if (ownerType === "PAGE") updateTag(tags.pages);
}

export async function updateMediaAlt(mediaId: string, _prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const parsed = mediaAltSchema.safeParse({ alt: formData.get("alt") ?? "" });
    if (!parsed.success) return failFromZod(parsed.error);
    const media = await db.media.update({ where: { id: mediaId }, data: { alt: parsed.data.alt } });
    await expireOwner(media.ownerType, media.ownerId);
    return ok(null);
  });
}

export async function deleteMedia(mediaId: string): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const media = await db.media.findUnique({ where: { id: mediaId } });
    if (!media) return ok(null);
    await db.$transaction(async (tx) => {
      await tx.media.delete({ where: { id: mediaId } });
      // Close the gap so positions stay contiguous.
      await tx.media.updateMany({
        where: { ownerType: media.ownerType, ownerId: media.ownerId, position: { gt: media.position } },
        data: { position: { decrement: 1 } },
      });
    });
    await deleteUpload(media.url);
    await expireOwner(media.ownerType, media.ownerId);
    return ok(null);
  });
}

/** Persist a new media order. `orderedIds` must be exactly the owner's media ids. */
export async function reorderMedia(ownerType: "PRODUCT" | "VARIANT" | "COLLECTION" | "PAGE", ownerId: string, orderedIds: string[]): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const current = await db.media.findMany({ where: { ownerType, ownerId }, select: { id: true } });
    const currentIds = new Set(current.map((m) => m.id));
    if (orderedIds.length !== currentIds.size || !orderedIds.every((id) => currentIds.has(id)) || new Set(orderedIds).size !== orderedIds.length) {
      return fail("The media list changed; reload and try again.");
    }
    await db.$transaction(orderedIds.map((id, position) => db.media.update({ where: { id }, data: { position } })));
    await expireOwner(ownerType, ownerId);
    return ok(null);
  });
}

// ---- collections ------------------------------------------------------------

function readCollectionForm(formData: FormData) {
  const title = String(formData.get("title") ?? "");
  const handleRaw = String(formData.get("handle") ?? "").trim();
  return collectionInputSchema.safeParse({
    title,
    handle: handleRaw === "" ? slugify(title) : handleRaw,
    description: formData.get("description") ?? "",
    type: formData.get("type"),
    seoTitle: formData.get("seoTitle") ?? "",
    seoDescription: formData.get("seoDescription") ?? "",
  });
}

export async function createCollection(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const result = await runAction<{ id: string }>(async () => {
    await assertAdmin();
    const parsed = readCollectionForm(formData);
    if (!parsed.success) return failFromZod(parsed.error);
    try {
      const created = await db.collection.create({ data: parsed.data, select: { id: true } });
      expire(collectionChangedTags(parsed.data.handle));
      return ok({ id: created.id });
    } catch (error) {
      if (isUniqueViolation(error, "handle")) return fail("Please fix the highlighted fields.", { handle: "This handle is already taken" });
      throw error;
    }
  });
  if (result.ok) redirect(`/admin/collections/${result.data.id}`);
  return result;
}

export async function updateCollection(id: string, _prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction<{ id: string }>(async () => {
    await assertAdmin();
    const parsed = readCollectionForm(formData);
    if (!parsed.success) return failFromZod(parsed.error);
    try {
      const before = await db.collection.findUnique({ where: { id }, select: { handle: true } });
      await db.collection.update({ where: { id }, data: parsed.data });
      expire(collectionChangedTags(parsed.data.handle));
      if (before && before.handle !== parsed.data.handle) updateTag(tags.collection(before.handle));
      return ok({ id });
    } catch (error) {
      if (isUniqueViolation(error, "handle")) return fail("Please fix the highlighted fields.", { handle: "This handle is already taken" });
      throw error;
    }
  });
}

export async function deleteCollection(id: string): Promise<ActionResult<null>> {
  const result = await runAction<null>(async () => {
    await assertAdmin();
    const deleted = await db.collection.delete({ where: { id } });
    expire(collectionChangedTags(deleted.handle));
    return ok(null);
  });
  if (result.ok) redirect("/admin/collections");
  return result;
}

export async function addProductToCollection(collectionId: string, productId: string): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const position = await db.collectionProduct.count({ where: { collectionId } });
    await db.collectionProduct.upsert({
      where: { collectionId_productId: { collectionId, productId } },
      create: { collectionId, productId, position },
      update: {},
    });
    await expireCollection(collectionId);
    return ok(null);
  });
}

export async function removeProductFromCollection(collectionId: string, productId: string): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    await db.$transaction(async (tx) => {
      const row = await tx.collectionProduct.findUnique({ where: { collectionId_productId: { collectionId, productId } } });
      if (!row) return;
      await tx.collectionProduct.delete({ where: { collectionId_productId: { collectionId, productId } } });
      await tx.collectionProduct.updateMany({ where: { collectionId, position: { gt: row.position } }, data: { position: { decrement: 1 } } });
    });
    await expireCollection(collectionId);
    return ok(null);
  });
}

export async function reorderCollectionProducts(collectionId: string, orderedProductIds: string[]): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const current = await db.collectionProduct.findMany({ where: { collectionId }, select: { productId: true } });
    const ids = new Set(current.map((c) => c.productId));
    if (orderedProductIds.length !== ids.size || !orderedProductIds.every((id) => ids.has(id)) || new Set(orderedProductIds).size !== orderedProductIds.length) {
      return fail("The product list changed; reload and try again.");
    }
    await db.$transaction(
      orderedProductIds.map((productId, position) =>
        db.collectionProduct.update({ where: { collectionId_productId: { collectionId, productId } }, data: { position } }),
      ),
    );
    await expireCollection(collectionId);
    return ok(null);
  });
}

export type PickerProduct = { id: string; title: string; handle: string; status: string; imageUrl: string | null };

/** Picker search is an action so the client can call it without a route. */
export async function searchProductsForPicker(q: string, excludeIds: string[]): Promise<ActionResult<PickerProduct[]>> {
  return runAction<PickerProduct[]>(async () => {
    await assertAdmin();
    const products = await searchProductsBrief(q, excludeIds);
    const covers = await coverImagesFor(products.map((p) => p.id));
    return ok(products.map((p) => ({ ...p, imageUrl: covers.get(p.id) ?? null })));
  });
}

// ---- collection rules -------------------------------------------------------

export async function saveCollectionRules(collectionId: string, _prev: ActionResult<{ count: number }> | null, formData: FormData): Promise<ActionResult<{ count: number }>> {
  return runAction<{ count: number }>(async () => {
    await assertAdmin();
    let raw: unknown;
    try {
      raw = JSON.parse(String(formData.get("rules") ?? ""));
    } catch {
      return fail("Could not read the rules.");
    }
    const parsed = collectionRulesSchema.safeParse(raw);
    if (!parsed.success) return failFromZod(parsed.error);
    await db.collection.update({ where: { id: collectionId }, data: { rules: parsed.data } });
    await expireCollection(collectionId);
    const { count } = await previewRules(parsed.data);
    return ok({ count });
  });
}

export async function previewCollectionRules(raw: unknown): Promise<ActionResult<{ count: number; sample: { id: string; title: string }[] }>> {
  return runAction(async () => {
    await assertAdmin();
    const parsed = collectionRulesSchema.safeParse(raw);
    if (!parsed.success) return failFromZod(parsed.error);
    return ok(await previewRules(parsed.data));
  });
}

// ---- storefront: instant search ---------------------------------------------

export type InstantHit = { id: string; handle: string; title: string; vendor: string | null; price: number; image: string | null };

/** Public: a few ranked hits for the header dropdown. */
export async function instantSearch(query: string): Promise<ActionResult<InstantHit[]>> {
  return runAction<InstantHit[]>(async () => {
    const q = query.trim();
    if (q.length < 2) return ok([]);
    const hits = await quickSearch(q, 6);
    return ok(hits.map((h) => ({ id: h.id, handle: h.handle, title: h.title, vendor: h.vendor, price: h.priceMin, image: h.image?.url ?? null })));
  });
}

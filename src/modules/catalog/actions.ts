"use server";

// catalog module — Server Actions. Every action returns an ActionResult; never throws.

import { redirect } from "next/navigation";
import { type ActionResult, fail, failFromZod, ok, runAction } from "@/src/lib/action-result";
import { assertAdmin } from "@/src/lib/auth/guards";
import { db } from "@/src/lib/db";
import { isUniqueViolation } from "@/src/lib/db-errors";
import { cleanOptions, combinations, planVariants } from "./matrix";
import { fromMajorUnits } from "@/src/lib/money";
import { MAX_VARIANTS, optionsInputSchema, productInputSchema, slugify, variantInputSchema } from "./types";

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
      const product = await db.product.create({ data: parsed.data, select: { id: true } });
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
      await db.product.update({ where: { id }, data: parsed.data });
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
      await db.variant.update({
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
      return ok(null);
    } catch (error) {
      if (isUniqueViolation(error, "sku")) return fail("Please fix the highlighted fields.", { sku: "Another variant already uses this SKU" });
      throw error;
    }
  });
}

"use server";

// catalog module — Server Actions. Every action returns an ActionResult; never throws.

import { redirect } from "next/navigation";
import { type ActionResult, fail, failFromZod, ok, runAction } from "@/src/lib/action-result";
import { assertAdmin } from "@/src/lib/auth/guards";
import { db } from "@/src/lib/db";
import { isUniqueViolation } from "@/src/lib/db-errors";
import { productInputSchema, slugify } from "./types";

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

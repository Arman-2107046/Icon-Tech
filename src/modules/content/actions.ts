"use server";

// content module — Server Actions. Every action returns an ActionResult; never throws.

import { redirect } from "next/navigation";
import { type ActionResult, fail, failFromZod, ok, runAction } from "@/src/lib/action-result";
import { assertAdmin } from "@/src/lib/auth/guards";
import { db } from "@/src/lib/db";
import { isUniqueViolation } from "@/src/lib/db-errors";
import { pageInputSchema, slugify } from "./types";

// ---- pages ------------------------------------------------------------------

function readPage(formData: FormData) {
  const title = String(formData.get("title") ?? "");
  const handleRaw = String(formData.get("handle") ?? "").trim();
  return pageInputSchema.safeParse({
    title,
    handle: handleRaw === "" ? slugify(title) : handleRaw,
    body: formData.get("body") ?? "",
    published: formData.get("published") === "on",
    seoTitle: formData.get("seoTitle") ?? "",
    seoDescription: formData.get("seoDescription") ?? "",
  });
}

const HANDLE_TAKEN = { handle: "This handle is already taken" };

export async function createPage(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const result = await runAction<{ id: string }>(async () => {
    await assertAdmin();
    const parsed = readPage(formData);
    if (!parsed.success) return failFromZod(parsed.error);
    const { published, ...data } = parsed.data;
    try {
      const page = await db.page.create({ data: { ...data, publishedAt: published ? new Date() : null }, select: { id: true } });
      return ok({ id: page.id });
    } catch (error) {
      if (isUniqueViolation(error, "handle")) return fail("Please fix the highlighted fields.", HANDLE_TAKEN);
      throw error;
    }
  });
  if (result.ok) redirect(`/admin/pages/${result.data.id}`);
  return result;
}

export async function updatePage(id: string, _prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction<{ id: string }>(async () => {
    await assertAdmin();
    const parsed = readPage(formData);
    if (!parsed.success) return failFromZod(parsed.error);
    const { published, ...data } = parsed.data;
    try {
      const existing = await db.page.findUnique({ where: { id }, select: { publishedAt: true } });
      if (!existing) return fail("Page not found.");
      // Keep the original publish date when it stays published.
      const publishedAt = published ? (existing.publishedAt ?? new Date()) : null;
      await db.page.update({ where: { id }, data: { ...data, publishedAt } });
      return ok({ id });
    } catch (error) {
      if (isUniqueViolation(error, "handle")) return fail("Please fix the highlighted fields.", HANDLE_TAKEN);
      throw error;
    }
  });
}

export async function deletePage(id: string): Promise<ActionResult<null>> {
  const result = await runAction<null>(async () => {
    await assertAdmin();
    await db.page.delete({ where: { id } });
    return ok(null);
  });
  if (result.ok) redirect("/admin/pages");
  return result;
}

"use server";

// content module — Server Actions. Every action returns an ActionResult; never throws.

import { redirect } from "next/navigation";
import { type ActionResult, fail, failFromZod, ok, runAction } from "@/src/lib/action-result";
import { assertAdmin } from "@/src/lib/auth/guards";
import { db } from "@/src/lib/db";
import { isUniqueViolation } from "@/src/lib/db-errors";
import { menuInputSchema, menuItemInputSchema, pageInputSchema, slugify } from "./types";

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

// ---- menus ------------------------------------------------------------------

export async function createMenu(_prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const title = String(formData.get("title") ?? "");
    const handleRaw = String(formData.get("handle") ?? "").trim();
    const parsed = menuInputSchema.safeParse({ title, handle: handleRaw === "" ? slugify(title) : handleRaw });
    if (!parsed.success) return failFromZod(parsed.error);
    try {
      await db.menu.create({ data: parsed.data });
      return ok(null);
    } catch (error) {
      if (isUniqueViolation(error, "handle")) return fail("Please fix the highlighted fields.", HANDLE_TAKEN);
      throw error;
    }
  });
}

export async function updateMenu(menuId: string, _prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const parsed = menuInputSchema.safeParse({ title: formData.get("title") ?? "", handle: formData.get("handle") ?? "" });
    if (!parsed.success) return failFromZod(parsed.error);
    try {
      await db.menu.update({ where: { id: menuId }, data: parsed.data });
      return ok(null);
    } catch (error) {
      if (isUniqueViolation(error, "handle")) return fail("Please fix the highlighted fields.", HANDLE_TAKEN);
      throw error;
    }
  });
}

export async function deleteMenu(menuId: string): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    await db.menu.delete({ where: { id: menuId } });
    return ok(null);
  });
}

function readMenuItem(formData: FormData) {
  return menuItemInputSchema.safeParse({ label: formData.get("label") ?? "", url: formData.get("url") ?? "", parentId: formData.get("parentId") ?? "" });
}

/** Parent must be a root item of the same menu: the tree is two levels deep. */
async function validParent(menuId: string, parentId: string | null, selfId?: string): Promise<boolean> {
  if (parentId === null) return true;
  if (parentId === selfId) return false;
  const parent = await db.menuItem.findUnique({ where: { id: parentId }, select: { menuId: true, parentId: true } });
  return parent !== null && parent.menuId === menuId && parent.parentId === null;
}

export async function createMenuItem(menuId: string, _prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const parsed = readMenuItem(formData);
    if (!parsed.success) return failFromZod(parsed.error);
    if (!(await validParent(menuId, parsed.data.parentId))) return fail("Please fix the highlighted fields.", { parentId: "Pick a top-level item of this menu" });
    const position = await db.menuItem.count({ where: { menuId, parentId: parsed.data.parentId } });
    await db.menuItem.create({ data: { ...parsed.data, menuId, position } });
    return ok(null);
  });
}

export async function updateMenuItem(itemId: string, _prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const parsed = readMenuItem(formData);
    if (!parsed.success) return failFromZod(parsed.error);
    const item = await db.menuItem.findUnique({ where: { id: itemId }, include: { children: { select: { id: true } } } });
    if (!item) return fail("Menu item not found.");
    if (!(await validParent(item.menuId, parsed.data.parentId, itemId))) return fail("Please fix the highlighted fields.", { parentId: "Pick a top-level item of this menu" });
    if (parsed.data.parentId !== null && item.children.length > 0) {
      return fail("Please fix the highlighted fields.", { parentId: "An item with children must stay at the top level" });
    }
    const movedGroup = parsed.data.parentId !== item.parentId;
    const position = movedGroup ? await db.menuItem.count({ where: { menuId: item.menuId, parentId: parsed.data.parentId } }) : item.position;
    await db.$transaction(async (tx) => {
      await tx.menuItem.update({ where: { id: itemId }, data: { ...parsed.data, position } });
      if (movedGroup) {
        await tx.menuItem.updateMany({ where: { menuId: item.menuId, parentId: item.parentId, position: { gt: item.position } }, data: { position: { decrement: 1 } } });
      }
    });
    return ok(null);
  });
}

export async function deleteMenuItem(itemId: string): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const item = await db.menuItem.findUnique({ where: { id: itemId } });
    if (!item) return ok(null);
    await db.$transaction(async (tx) => {
      await tx.menuItem.delete({ where: { id: itemId } }); // children cascade
      await tx.menuItem.updateMany({ where: { menuId: item.menuId, parentId: item.parentId, position: { gt: item.position } }, data: { position: { decrement: 1 } } });
    });
    return ok(null);
  });
}

/** Swap an item with its previous or next sibling. */
export async function moveMenuItem(itemId: string, direction: "up" | "down"): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const item = await db.menuItem.findUnique({ where: { id: itemId } });
    if (!item) return fail("Menu item not found.");
    const siblings = await db.menuItem.findMany({ where: { menuId: item.menuId, parentId: item.parentId }, orderBy: { position: "asc" } });
    const index = siblings.findIndex((s) => s.id === itemId);
    const swapWith = siblings[direction === "up" ? index - 1 : index + 1];
    if (!swapWith) return ok(null);
    await db.$transaction([
      db.menuItem.update({ where: { id: item.id }, data: { position: swapWith.position } }),
      db.menuItem.update({ where: { id: swapWith.id }, data: { position: item.position } }),
    ]);
    return ok(null);
  });
}

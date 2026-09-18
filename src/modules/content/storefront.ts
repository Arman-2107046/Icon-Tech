// content module — cached storefront reads, tagged for exact invalidation.

import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/src/lib/db";
import { tags } from "@/src/lib/cache-tags";
import { buildMenuTree } from "./queries";
import { DEFAULT_SITE_SETTINGS, siteSettingsSchema, type SiteSettings, type StorefrontMenu } from "./types";

export async function getCachedSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheLife("max");
  cacheTag(tags.settings);
  const row = await db.siteSettings.findUnique({ where: { id: "default" } });
  const parsed = siteSettingsSchema.safeParse(row?.data ?? {});
  return parsed.success ? parsed.data : DEFAULT_SITE_SETTINGS;
}

export async function getMenu(handle: string): Promise<StorefrontMenu | null> {
  "use cache";
  cacheLife("max");
  cacheTag(tags.menu(handle), tags.menus);
  const menu = await db.menu.findUnique({ where: { handle }, include: { items: { orderBy: { position: "asc" } } } });
  if (!menu) return null;
  return { id: menu.id, handle: menu.handle, title: menu.title, items: buildMenuTree(menu.items) };
}


export async function getPublishedPage(handle: string) {
  "use cache";
  cacheLife("max");
  cacheTag(tags.page(handle), tags.pages);
  return db.page.findFirst({ where: { handle, publishedAt: { not: null } } });
}

export async function listPublishedPages() {
  "use cache";
  cacheLife("max");
  cacheTag(tags.pages);
  return db.page.findMany({ where: { publishedAt: { not: null } }, select: { handle: true, title: true, updatedAt: true } });
}

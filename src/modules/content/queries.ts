// content module — read-side queries. Server only; imported via ./index.ts.
import "server-only";

import type { Prisma } from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";
import { DEFAULT_SITE_SETTINGS, siteSettingsSchema, type SiteSettings } from "./types";

// ---- pages ------------------------------------------------------------------

export type AdminPageListParams = { q: string; sort: "title" | "updatedAt"; dir: "asc" | "desc"; skip: number; take: number };

export async function listPagesForAdmin(params: AdminPageListParams) {
  const where: Prisma.PageWhereInput = params.q
    ? { OR: [{ title: { contains: params.q, mode: "insensitive" } }, { handle: { contains: params.q, mode: "insensitive" } }] }
    : {};
  const [rows, total] = await Promise.all([
    db.page.findMany({
      where,
      orderBy: { [params.sort]: params.dir },
      skip: params.skip,
      take: params.take,
      select: { id: true, handle: true, title: true, publishedAt: true, updatedAt: true },
    }),
    db.page.count({ where }),
  ]);
  return { rows, total };
}
export type AdminPageRow = Awaited<ReturnType<typeof listPagesForAdmin>>["rows"][number];

export async function getPageForAdmin(id: string) {
  return db.page.findUnique({ where: { id } });
}

// ---- menus ------------------------------------------------------------------

export async function listMenusForAdmin() {
  return db.menu.findMany({
    orderBy: { title: "asc" },
    include: { items: { orderBy: { position: "asc" } } },
  });
}
export type AdminMenu = Awaited<ReturnType<typeof listMenusForAdmin>>[number];
export type AdminMenuItem = AdminMenu["items"][number];

export type MenuTreeItem = AdminMenuItem & { children: AdminMenuItem[] };

/** Two-level tree in position order. Orphans (parent missing) become roots. */
export function buildMenuTree(items: AdminMenuItem[]): MenuTreeItem[] {
  const ids = new Set(items.map((i) => i.id));
  const roots = items.filter((i) => !i.parentId || !ids.has(i.parentId));
  return roots.map((root) => ({ ...root, children: items.filter((i) => i.parentId === root.id) }));
}

// ---- site settings ----------------------------------------------------------

/** The single settings row, validated and merged with defaults. */
export async function getSiteSettings(): Promise<SiteSettings> {
  const row = await db.siteSettings.findUnique({ where: { id: "default" } });
  const parsed = siteSettingsSchema.safeParse(row?.data ?? {});
  return parsed.success ? parsed.data : DEFAULT_SITE_SETTINGS;
}

// content module — read-side queries. Server only; imported via ./index.ts.
import "server-only";

import type { Prisma } from "@/src/generated/prisma/client";
import { db } from "@/src/lib/db";

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

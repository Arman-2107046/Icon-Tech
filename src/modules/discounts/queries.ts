// discounts module — read-side queries. Server only; imported via ./index.ts.
import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { tags } from "@/src/lib/cache-tags";
import { db } from "@/src/lib/db";
import { applyDiscounts, type ApplicableDiscount, type DiscountApplication } from "./types";

export async function listDiscounts() {
  return db.discount.findMany({ orderBy: [{ active: "desc" }, { createdAt: "desc" }], include: { _count: { select: { redemptions: true } } } });
}

/** Active codes by code, cached; eligibility (usage, window, minimum) is checked live. */
async function findByCode(code: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(tags.discounts);
  return db.discount.findUnique({ where: { code } });
}

export type Ineligible = { ok: false; reason: string };
export type Eligible = { ok: true; discount: ApplicableDiscount };

/** Why a code cannot be used right now, or the applicable discount. */
export async function checkEligibility(code: string, ctx: { subtotal: number; customerId: string | null }): Promise<Eligible | Ineligible> {
  const d = await findByCode(code.trim().toUpperCase());
  const now = Date.now();
  if (!d || !d.active) return { ok: false, reason: "That code is not valid." };
  if (d.startsAt && d.startsAt.getTime() > now) return { ok: false, reason: "That code is not active yet." };
  if (d.endsAt && d.endsAt.getTime() < now) return { ok: false, reason: "That code has expired." };
  if (d.minOrderSubtotal !== null && ctx.subtotal < d.minOrderSubtotal) return { ok: false, reason: "Your order does not meet the minimum for this code." };
  if (d.usageLimit !== null) {
    const used = await db.discountRedemption.count({ where: { discountId: d.id } });
    if (used >= d.usageLimit) return { ok: false, reason: "That code has been fully redeemed." };
  }
  if (d.usageLimitPerUser !== null && ctx.customerId) {
    const used = await db.discountRedemption.count({ where: { discountId: d.id, customerId: ctx.customerId } });
    if (used >= d.usageLimitPerUser) return { ok: false, reason: "You have already used this code." };
  }
  return { ok: true, discount: { id: d.id, code: d.code, type: d.type, value: d.value, stackable: d.stackable } };
}

/**
 * Resolve the codes stored on a cart: silently drops any that stopped being
 * eligible (expired, exhausted) so a stale cart never gets a discount it
 * should not. Returns the surviving codes so the caller can persist them.
 */
export async function resolveCartDiscounts(codes: readonly string[], ctx: { subtotal: number; customerId: string | null }): Promise<DiscountApplication & { codes: string[] }> {
  const eligible: ApplicableDiscount[] = [];
  for (const code of codes) {
    const r = await checkEligibility(code, ctx);
    if (r.ok) eligible.push(r.discount);
  }
  const app = applyDiscounts(eligible, ctx.subtotal);
  return { ...app, codes: app.applied.map((a) => a.code) };
}

"use server";

// discounts module — Server Actions. Every action returns an ActionResult; never throws.

import { updateTag } from "next/cache";
import { type ActionResult, fail, failFromZod, ok, runAction } from "@/src/lib/action-result";
import { assertAdmin } from "@/src/lib/auth/guards";
import { tags } from "@/src/lib/cache-tags";
import { db } from "@/src/lib/db";
import { isUniqueViolation } from "@/src/lib/db-errors";
import { discountInputSchema, type DiscountInput } from "./types";

function read(formData: FormData) {
  const s = (k: string) => String(formData.get(k) ?? "");
  return discountInputSchema.safeParse({
    code: s("code"),
    title: s("title"),
    type: s("type"),
    value: s("value"),
    minOrderSubtotal: s("minOrderSubtotal"),
    usageLimit: s("usageLimit"),
    usageLimitPerUser: s("usageLimitPerUser"),
    stackable: formData.get("stackable") === "on",
    active: formData.get("active") === "on",
    startsAt: s("startsAt"),
    endsAt: s("endsAt"),
  });
}

/** Percentage → basis points; amounts → minor units; free shipping → 0. */
function toRow(d: DiscountInput) {
  const value = d.type === "FREE_SHIPPING" ? 0 : Math.round(Number(d.value) * 100);
  return {
    code: d.code,
    title: d.title,
    type: d.type,
    value,
    minOrderSubtotal: d.minOrderSubtotal === null ? null : Math.round(d.minOrderSubtotal * 100),
    usageLimit: d.usageLimit,
    usageLimitPerUser: d.usageLimitPerUser,
    stackable: d.stackable,
    active: d.active,
    startsAt: d.startsAt,
    endsAt: d.endsAt,
  };
}

const DUPLICATE = "A discount with this code already exists";

export async function createDiscount(_prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const parsed = read(formData);
    if (!parsed.success) return failFromZod(parsed.error);
    try {
      await db.discount.create({ data: toRow(parsed.data) });
    } catch (error) {
      if (isUniqueViolation(error, "code")) return fail("Please fix the highlighted fields.", { code: DUPLICATE });
      throw error;
    }
    updateTag(tags.discounts);
    return ok(null);
  });
}

export async function updateDiscount(id: string, _prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const parsed = read(formData);
    if (!parsed.success) return failFromZod(parsed.error);
    try {
      await db.discount.update({ where: { id }, data: toRow(parsed.data) });
    } catch (error) {
      if (isUniqueViolation(error, "code")) return fail("Please fix the highlighted fields.", { code: DUPLICATE });
      throw error;
    }
    updateTag(tags.discounts);
    return ok(null);
  });
}

export async function deleteDiscount(id: string): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    await db.discount.delete({ where: { id } });
    updateTag(tags.discounts);
    return ok(null);
  });
}

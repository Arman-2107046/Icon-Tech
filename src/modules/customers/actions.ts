"use server";

// customers module — Server Actions. Every action returns an ActionResult; never throws.

import { z } from "zod";
import { type ActionResult, fail, failFromZod, ok, runAction } from "@/src/lib/action-result";
import { db } from "@/src/lib/db";

const emailSchema = z.object({ email: z.email("Enter a valid email address").transform((v) => v.trim().toLowerCase()) });

/**
 * Newsletter sign-up: creates the customer if needed and opts them in.
 * Idempotent, and never reveals whether the address already existed.
 */
export async function subscribeNewsletter(_prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    const parsed = emailSchema.safeParse({ email: formData.get("email") });
    if (!parsed.success) return failFromZod(parsed.error);
    await db.customer.upsert({
      where: { email: parsed.data.email },
      create: { email: parsed.data.email, acceptsMarketing: true },
      update: { acceptsMarketing: true },
    });
    return ok(null);
  });
}

// ---- account: addresses -----------------------------------------------------------

import { getCustomerSession } from "@/src/lib/auth/session";
import { addressSchema } from "@/src/modules/checkout/types";

function readAddress(formData: FormData) {
  const get = (k: string) => formData.get(k) ?? "";
  return addressSchema.safeParse({ firstName: get("firstName"), lastName: get("lastName"), company: get("company"), line1: get("line1"), line2: get("line2"), city: get("city"), region: get("region"), postalCode: get("postalCode"), country: get("country") });
}

export async function saveAddress(addressId: string | null, _prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    const session = await getCustomerSession();
    if (!session) return fail("Please sign in again.");
    const parsed = readAddress(formData);
    if (!parsed.success) return failFromZod(parsed.error);
    const makeDefault = formData.get("isDefault") === "on";
    const customerId = session.customer.id;
    await db.$transaction(async (tx) => {
      if (makeDefault) await tx.address.updateMany({ where: { customerId }, data: { isDefault: false } });
      if (addressId) {
        const owned = await tx.address.findFirst({ where: { id: addressId, customerId }, select: { id: true } });
        if (!owned) throw new Error("Address not found");
        await tx.address.update({ where: { id: addressId }, data: { ...parsed.data, phone: null, ...(makeDefault ? { isDefault: true } : {}) } });
      } else {
        const count = await tx.address.count({ where: { customerId } });
        await tx.address.create({ data: { ...parsed.data, customerId, phone: null, isDefault: makeDefault || count === 0 } });
      }
    });
    return ok(null);
  });
}

export async function deleteAddress(addressId: string): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    const session = await getCustomerSession();
    if (!session) return fail("Please sign in again.");
    await db.address.deleteMany({ where: { id: addressId, customerId: session.customer.id } });
    return ok(null);
  });
}

// ---- admin ---------------------------------------------------------------------

import { assertAdmin } from "@/src/lib/auth/guards";

export async function saveCustomerNote(customerId: string, _prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const note = String(formData.get("note") ?? "").slice(0, 2000);
    await db.customer.update({ where: { id: customerId }, data: { note } });
    return ok(null);
  });
}

export async function setCustomerMarketing(customerId: string, accepts: boolean): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    await db.customer.update({ where: { id: customerId }, data: { acceptsMarketing: accepts } });
    return ok(null);
  });
}

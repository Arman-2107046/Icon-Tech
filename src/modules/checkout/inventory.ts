import "server-only";

import { db } from "@/src/lib/db";

/**
 * Inventory holds for a cart in checkout. Sellable = available − reserved.
 * A reservation row per (cart, variant) records how much of `reserved`
 * belongs to this cart; adjusting it moves the counter by the delta.
 * Holds expire after 30 minutes and are released by the cron route.
 */
export const RESERVATION_TTL_MS = 30 * 60 * 1000;

export type ReservationOutcome = { ok: true } | { ok: false; shortages: { variantId: string; title: string; requested: number; sellable: number }[] };

/**
 * Bring this cart's reservations in line with its lines. Fails (changing
 * nothing) if any line asks for more than can be held; the caller caps the
 * cart and tells the customer.
 */
export async function reserveCart(cartId: string): Promise<ReservationOutcome> {
  return db.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({
      where: { id: cartId },
      include: { items: { include: { variant: { include: { inventory: true } } } }, reservations: true },
    });
    if (!cart) return { ok: false, shortages: [] };
    const mine = new Map(cart.reservations.map((r) => [r.variantId, r]));
    const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS);
    const shortages: { variantId: string; title: string; requested: number; sellable: number }[] = [];

    for (const item of cart.items) {
      const inv = item.variant.inventory;
      const held = mine.get(item.variantId)?.quantity ?? 0;
      // What others hold = reserved minus what this cart already holds.
      const sellableForUs = Math.max(0, (inv?.available ?? 0) - ((inv?.reserved ?? 0) - held));
      if (item.quantity > sellableForUs) shortages.push({ variantId: item.variantId, title: item.variant.title, requested: item.quantity, sellable: sellableForUs });
    }
    if (shortages.length) return { ok: false, shortages };

    for (const item of cart.items) {
      const held = mine.get(item.variantId)?.quantity ?? 0;
      const delta = item.quantity - held;
      if (delta !== 0) {
        await tx.inventoryItem.update({ where: { variantId: item.variantId }, data: { reserved: { increment: delta } } });
      }
      await tx.inventoryReservation.upsert({
        where: { cartId_variantId: { cartId, variantId: item.variantId } },
        create: { cartId, variantId: item.variantId, quantity: item.quantity, expiresAt },
        update: { quantity: item.quantity, expiresAt },
      });
    }
    // Lines removed from the cart give their hold back.
    for (const r of cart.reservations) {
      if (!cart.items.some((i) => i.variantId === r.variantId)) {
        await tx.inventoryItem.update({ where: { variantId: r.variantId }, data: { reserved: { decrement: r.quantity } } });
        await tx.inventoryReservation.delete({ where: { id: r.id } });
      }
    }
    return { ok: true };
  });
}

// ---- commit (pure) ---------------------------------------------------------

export type CommitLine = { variantId: string; title: string; quantity: number; available: number };
export type CommitProblem = { variantId: string; reason: "RESERVATION" | "STOCK"; title: string };
export type CommitPlan = { ok: true; updates: { variantId: string; available: number; reserved: number }[] } | { ok: false; problem: CommitProblem };

/**
 * What placing the order does to inventory: every line must be fully held
 * by this cart and still in stock; then available −= quantity and reserved
 * −= what the cart held. Pure so the arithmetic is unit-tested; the order
 * service applies the updates inside its transaction.
 */
export function planCommit(lines: readonly CommitLine[], holds: ReadonlyMap<string, number>): CommitPlan {
  for (const line of lines) {
    if ((holds.get(line.variantId) ?? 0) < line.quantity) return { ok: false, problem: { variantId: line.variantId, reason: "RESERVATION", title: line.title } };
    if (line.available < line.quantity) return { ok: false, problem: { variantId: line.variantId, reason: "STOCK", title: line.title } };
  }
  return { ok: true, updates: lines.map((l) => ({ variantId: l.variantId, available: -l.quantity, reserved: -(holds.get(l.variantId) ?? 0) })) };
}

/** Give back every hold for a cart (abandoned checkout). */
export async function releaseCart(cartId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const rows = await tx.inventoryReservation.findMany({ where: { cartId } });
    for (const r of rows) {
      await tx.inventoryItem.update({ where: { variantId: r.variantId }, data: { reserved: { decrement: r.quantity } } });
    }
    await tx.inventoryReservation.deleteMany({ where: { cartId } });
  });
}

/** Release holds past their expiry. Returns how many rows were released. */
export async function releaseExpiredReservations(now = new Date()): Promise<number> {
  return db.$transaction(async (tx) => {
    const rows = await tx.inventoryReservation.findMany({ where: { expiresAt: { lt: now } } });
    for (const r of rows) {
      await tx.inventoryItem.update({ where: { variantId: r.variantId }, data: { reserved: { decrement: r.quantity } } });
    }
    if (rows.length) await tx.inventoryReservation.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
    return rows.length;
  });
}

import { describe, expect, it, vi } from "vitest";

/**
 * Inventory holds against an in-memory stand-in for the Prisma client:
 * just the calls reserveCart / releaseCart / releaseExpiredReservations
 * make, with increment/decrement semantics.
 */
type Inv = { variantId: string; available: number; reserved: number };
type Res = { id: string; cartId: string; variantId: string; quantity: number; expiresAt: Date };
type Item = { variantId: string; quantity: number; variant: { title: string; inventory: Inv } };

const state = { inventory: new Map<string, Inv>(), reservations: [] as Res[], items: [] as Item[], seq: 0 };

function apply(n: number, op: number | { increment?: number; decrement?: number }): number {
  if (typeof op === "number") return op;
  return n + (op.increment ?? 0) - (op.decrement ?? 0);
}

const tx = {
  cart: {
    findUnique: async ({ where }: { where: { id: string } }) =>
      where.id === "cart-1" ? { id: "cart-1", items: state.items.map((i) => ({ ...i, variant: { ...i.variant, inventory: state.inventory.get(i.variantId) } })), reservations: state.reservations.filter((r) => r.cartId === "cart-1") } : null,
  },
  inventoryItem: {
    update: async ({ where, data }: { where: { variantId: string }; data: { reserved?: number | { increment?: number; decrement?: number } } }) => {
      const inv = state.inventory.get(where.variantId);
      if (!inv) throw new Error("no inventory");
      if (data.reserved !== undefined) inv.reserved = apply(inv.reserved, data.reserved);
      return inv;
    },
  },
  inventoryReservation: {
    upsert: async ({ where, create, update }: { where: { cartId_variantId: { cartId: string; variantId: string } }; create: Omit<Res, "id">; update: { quantity: number; expiresAt: Date } }) => {
      const found = state.reservations.find((r) => r.cartId === where.cartId_variantId.cartId && r.variantId === where.cartId_variantId.variantId);
      if (found) Object.assign(found, update);
      else state.reservations.push({ id: `r${++state.seq}`, ...create });
    },
    delete: async ({ where }: { where: { id: string } }) => {
      state.reservations = state.reservations.filter((r) => r.id !== where.id);
    },
    findMany: async ({ where }: { where: { cartId?: string; expiresAt?: { lt: Date } } }) =>
      state.reservations.filter((r) => (where.cartId ? r.cartId === where.cartId : true) && (where.expiresAt ? r.expiresAt < where.expiresAt.lt : true)),
    deleteMany: async ({ where }: { where: { cartId?: string; id?: { in: string[] } } }) => {
      state.reservations = state.reservations.filter((r) => !(where.cartId ? r.cartId === where.cartId : where.id ? where.id.in.includes(r.id) : false));
    },
  },
};

vi.mock("@/src/lib/db", () => ({ db: { $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx) } }));

const { reserveCart, releaseCart, releaseExpiredReservations, planCommit, RESERVATION_TTL_MS } = await import("@/src/modules/checkout/inventory");

function reset(available: number, othersHold = 0) {
  state.inventory = new Map([["v1", { variantId: "v1", available, reserved: othersHold }]]);
  state.reservations = othersHold ? [{ id: "other", cartId: "cart-2", variantId: "v1", quantity: othersHold, expiresAt: new Date(Date.now() + 60_000) }] : [];
  state.items = [];
  state.seq = 0;
}
const line = (quantity: number, variantId = "v1"): Item => ({ variantId, quantity, variant: { title: "Widget", inventory: state.inventory.get(variantId) as Inv } });

describe("reserveCart", () => {
  it("holds what the cart asks for and extends on re-reserve", async () => {
    reset(10);
    state.items = [line(3)];
    expect(await reserveCart("cart-1")).toEqual({ ok: true });
    expect(state.inventory.get("v1")?.reserved).toBe(3);
    const first = state.reservations[0]?.expiresAt.getTime() ?? 0;
    expect(first).toBeGreaterThan(Date.now() + RESERVATION_TTL_MS - 5000);

    // Quantity change moves the counter by the delta, not the total.
    state.items = [line(5)];
    expect(await reserveCart("cart-1")).toEqual({ ok: true });
    expect(state.inventory.get("v1")?.reserved).toBe(5);
    expect(state.reservations).toHaveLength(1);
  });

  it("refuses (changing nothing) when others' holds leave too little", async () => {
    reset(10, 8);
    state.items = [line(3)];
    const out = await reserveCart("cart-1");
    expect(out).toEqual({ ok: false, shortages: [{ variantId: "v1", title: "Widget", requested: 3, sellable: 2 }] });
    expect(state.inventory.get("v1")?.reserved).toBe(8);
    expect(state.reservations.filter((r) => r.cartId === "cart-1")).toHaveLength(0);
  });

  it("does not count the cart's own hold against itself", async () => {
    reset(5);
    state.items = [line(5)];
    expect(await reserveCart("cart-1")).toEqual({ ok: true });
    // Re-reserving the same 5 is fine even though reserved now equals available.
    expect(await reserveCart("cart-1")).toEqual({ ok: true });
    expect(state.inventory.get("v1")?.reserved).toBe(5);
  });

  it("gives back holds for lines removed from the cart", async () => {
    reset(10);
    state.inventory.set("v2", { variantId: "v2", available: 4, reserved: 0 });
    state.items = [line(2), line(1, "v2")];
    await reserveCart("cart-1");
    state.items = [line(2)];
    await reserveCart("cart-1");
    expect(state.inventory.get("v2")?.reserved).toBe(0);
    expect(state.reservations.map((r) => r.variantId)).toEqual(["v1"]);
  });
});

describe("release", () => {
  it("releaseCart returns every hold of that cart only", async () => {
    reset(10, 2);
    state.items = [line(4)];
    await reserveCart("cart-1");
    expect(state.inventory.get("v1")?.reserved).toBe(6);
    await releaseCart("cart-1");
    expect(state.inventory.get("v1")?.reserved).toBe(2);
    expect(state.reservations.map((r) => r.cartId)).toEqual(["cart-2"]);
  });

  it("releaseExpiredReservations only touches rows past their expiry", async () => {
    reset(10, 2);
    state.items = [line(4)];
    await reserveCart("cart-1");
    expect(await releaseExpiredReservations(new Date())).toBe(0);
    const released = await releaseExpiredReservations(new Date(Date.now() + RESERVATION_TTL_MS + 1));
    expect(released).toBe(2); // this cart's hold and the other cart's
    expect(state.inventory.get("v1")?.reserved).toBe(0);
    expect(state.reservations).toHaveLength(0);
  });
});

describe("planCommit", () => {
  const holds = new Map([["v1", 2]]);
  it("decrements available by the quantity and reserved by what was held", () => {
    expect(planCommit([{ variantId: "v1", title: "Widget", quantity: 2, available: 5 }], holds)).toEqual({ ok: true, updates: [{ variantId: "v1", available: -2, reserved: -2 }] });
  });
  it("rejects a line whose hold expired or shrank", () => {
    expect(planCommit([{ variantId: "v1", title: "Widget", quantity: 3, available: 5 }], holds)).toEqual({ ok: false, problem: { variantId: "v1", reason: "RESERVATION", title: "Widget" } });
    expect(planCommit([{ variantId: "v9", title: "Gizmo", quantity: 1, available: 5 }], holds)).toMatchObject({ ok: false, problem: { reason: "RESERVATION" } });
  });
  it("rejects a line that sold out underneath its hold", () => {
    expect(planCommit([{ variantId: "v1", title: "Widget", quantity: 2, available: 1 }], holds)).toEqual({ ok: false, problem: { variantId: "v1", reason: "STOCK", title: "Widget" } });
  });
});

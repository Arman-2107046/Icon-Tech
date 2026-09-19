import { describe, expect, it } from "vitest";
import { applyDiscounts, canCombine, type ApplicableDiscount } from "@/src/modules/discounts/types";

const pct = (code: string, bps: number, stackable = true): ApplicableDiscount => ({ id: code, code, type: "PERCENTAGE", value: bps, stackable });
const flat = (code: string, minor: number, stackable = true): ApplicableDiscount => ({ id: code, code, type: "FIXED_AMOUNT", value: minor, stackable });
const ship = (code: string, stackable = true): ApplicableDiscount => ({ id: code, code, type: "FREE_SHIPPING", value: 0, stackable });

describe("applyDiscounts", () => {
  it("applies percentages before fixed amounts, against the original subtotal", () => {
    const r = applyDiscounts([flat("FLAT", 50_000), pct("TEN", 1000)], 1_250_000);
    expect(r.applied.map((a) => a.code)).toEqual(["TEN", "FLAT"]);
    expect(r.applied.map((a) => a.amount)).toEqual([125_000, 50_000]);
    expect(r.amount).toBe(175_000);
    expect(r.freeShipping).toBe(false);
  });

  it("caps combined percentages at 100% and the total at the subtotal", () => {
    const r = applyDiscounts([pct("A", 7000), pct("B", 5000), flat("C", 999)], 10_000);
    expect(r.applied.map((a) => a.amount)).toEqual([7000, 3000, 0]);
    expect(r.amount).toBe(10_000);
  });

  it("an exclusive code wins alone even when stackables are present", () => {
    const r = applyDiscounts([pct("STACK", 1000), flat("SOLO", 2000, false), ship("FREE")], 100_000);
    expect(r.applied.map((a) => a.code)).toEqual(["SOLO"]);
    expect(r.amount).toBe(2000);
    expect(r.freeShipping).toBe(false);
  });

  it("free shipping is a flag that takes nothing off the subtotal", () => {
    const r = applyDiscounts([ship("FREE"), pct("TEN", 1000)], 20_000);
    expect(r.amount).toBe(2000);
    expect(r.freeShipping).toBe(true);
    expect(r.applied.find((a) => a.code === "FREE")?.amount).toBe(0);
  });

  it("rounds half up on percentage amounts and never goes negative", () => {
    expect(applyDiscounts([pct("P", 500)], 101).amount).toBe(5); // 5.05 → 5
    expect(applyDiscounts([pct("P", 500)], 110).amount).toBe(6); // 5.5 → 6
    expect(applyDiscounts([flat("F", 500)], 0).amount).toBe(0);
    expect(applyDiscounts([], 5000)).toEqual({ applied: [], amount: 0, freeShipping: false });
  });
});

describe("canCombine", () => {
  it("anything may be the first code", () => {
    expect(canCombine([], { stackable: false })).toBe(true);
  });
  it("only stackables join stackables", () => {
    expect(canCombine([{ stackable: true }], { stackable: true })).toBe(true);
    expect(canCombine([{ stackable: true }], { stackable: false })).toBe(false);
    expect(canCombine([{ stackable: false }], { stackable: true })).toBe(false);
  });
});

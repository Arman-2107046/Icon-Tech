import { describe, expect, it } from "vitest";
import { computeTotals, eligibleRates, pickTaxBps } from "@/src/modules/checkout/totals";

describe("computeTotals", () => {
  it("taxes the discounted subtotal and never taxes shipping", () => {
    expect(computeTotals({ subtotal: 180000, discount: 18000, shipping: 6000, taxBps: 500 })).toEqual({
      subtotal: 180000,
      discount: 18000,
      taxable: 162000,
      shipping: 6000,
      tax: 8100,
      total: 176100,
    });
  });

  it("clamps discount to the subtotal and honours free shipping", () => {
    const t = computeTotals({ subtotal: 5000, discount: 9000, shipping: 6000, taxBps: 500, freeShipping: true });
    expect(t.discount).toBe(5000);
    expect(t.taxable).toBe(0);
    expect(t.shipping).toBe(0);
    expect(t.total).toBe(0);
  });

  it("never goes negative and treats an empty cart as all zeros", () => {
    expect(computeTotals({ subtotal: 0, discount: 500, shipping: 6000, taxBps: 500 })).toEqual({ subtotal: 0, discount: 0, taxable: 0, shipping: 6000, tax: 0, total: 6000 });
    expect(computeTotals({ subtotal: 1000, discount: -50, shipping: -10, taxBps: -500 })).toEqual({ subtotal: 1000, discount: 0, taxable: 1000, shipping: 0, tax: 0, total: 1000 });
  });

  it("adds up: taxable + shipping + tax === total for a realistic order", () => {
    const t = computeTotals({ subtotal: 1_250_000, discount: 125_000, shipping: 15_000, taxBps: 500 });
    expect(t.taxable).toBe(1_125_000);
    expect(t.tax).toBe(56_250);
    expect(t.total).toBe(t.taxable + t.shipping + t.tax);
    expect(t.total).toBe(1_196_250);
  });

  it("rounds tax half up on the minor unit", () => {
    expect(computeTotals({ subtotal: 101, discount: 0, shipping: 0, taxBps: 500 }).tax).toBe(5); // 5.05 -> 5
    expect(computeTotals({ subtotal: 110, discount: 0, shipping: 0, taxBps: 500 }).tax).toBe(6); // 5.5 -> 6
  });
});

describe("eligibleRates / pickTaxBps", () => {
  const rates = [
    { name: "Inside Dhaka", minOrderSubtotal: null, maxOrderSubtotal: 499999 },
    { name: "Free", minOrderSubtotal: 500000, maxOrderSubtotal: null },
  ];
  it("selects rates by subtotal bounds", () => {
    expect(eligibleRates(rates, 100000).map((r) => r.name)).toEqual(["Inside Dhaka"]);
    expect(eligibleRates(rates, 500000).map((r) => r.name)).toEqual(["Free"]);
  });
  it("prefers a region rate over the country rate, case-insensitively", () => {
    const tax = [
      { country: "BD", region: null, rateBps: 500 },
      { country: "BD", region: "Dhaka", rateBps: 750 },
    ];
    expect(pickTaxBps(tax, "BD", "dhaka")).toBe(750);
    expect(pickTaxBps(tax, "BD", "Sylhet")).toBe(500);
    expect(pickTaxBps(tax, "GB", null)).toBe(0);
  });
});

describe("addressSchema", () => {
  it("re-parses its own output (nulls for blank optionals)", async () => {
    const { addressSchema, checkoutDataSchema } = await import("@/src/modules/checkout/schemas");
    const first = addressSchema.parse({ firstName: "A", lastName: "B", company: "", line1: "House 1", line2: "", city: "Dhaka", region: "", postalCode: "", country: "bd" });
    expect(first.region).toBeNull();
    expect(first.country).toBe("BD");
    expect(addressSchema.parse(first)).toEqual(first);
    expect(checkoutDataSchema.parse({ step: "shipping", shippingAddress: first, billingAddress: null }).step).toBe("shipping");
  });
});

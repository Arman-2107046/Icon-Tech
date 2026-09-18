import { describe, expect, it } from "vitest";
import { findVariant, initialSelection, isValueAvailable, stockLabel, type ViewVariant } from "@/src/modules/catalog/product-view";

const v = (id: string, selection: Record<string, string>, sellable: number): ViewVariant => ({ id, title: id, sku: null, price: 100, compareAtPrice: null, sellable, selection, media: [] });
const variants = [
  v("s-red", { Size: "S", Colour: "Red" }, 3),
  v("s-blue", { Size: "S", Colour: "Blue" }, 0),
  v("m-red", { Size: "M", Colour: "Red" }, 0),
  v("m-blue", { Size: "M", Colour: "Blue" }, 8),
];

describe("variant matrix", () => {
  it("finds the variant for a complete selection", () => {
    expect(findVariant(variants, { Size: "M", Colour: "Blue" })?.id).toBe("m-blue");
    expect(findVariant(variants, { Size: "M" })).toBeNull();
  });

  it("marks values unavailable relative to the other selected values", () => {
    // With Size S selected, Blue is sold out; with M selected, Red is.
    expect(isValueAvailable(variants, { Size: "S", Colour: "Red" }, "Colour", "Blue")).toBe(false);
    expect(isValueAvailable(variants, { Size: "M", Colour: "Blue" }, "Colour", "Red")).toBe(false);
    expect(isValueAvailable(variants, { Size: "M", Colour: "Blue" }, "Size", "S")).toBe(false); // S/Blue sold out
    expect(isValueAvailable(variants, { Size: "S", Colour: "Red" }, "Size", "M")).toBe(false); // M/Red sold out
    expect(isValueAvailable(variants, { Size: "S", Colour: "Red" }, "Size", "S")).toBe(true);
  });

  it("initial selection prefers the requested variant, then the first purchasable", () => {
    expect(initialSelection(variants, "m-blue")).toEqual({ Size: "M", Colour: "Blue" });
    expect(initialSelection(variants, "nope")).toEqual({ Size: "S", Colour: "Red" });
    expect(initialSelection([v("only", {}, 0)], null)).toEqual({});
  });

  it("stock labels", () => {
    expect(stockLabel(0)).toEqual({ text: "Sold out", tone: "danger" });
    expect(stockLabel(3)).toEqual({ text: "Only 3 left", tone: "neutral" });
    expect(stockLabel(40)).toEqual({ text: "In stock", tone: "success" });
  });
});

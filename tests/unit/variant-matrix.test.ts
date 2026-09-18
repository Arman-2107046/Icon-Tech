import { describe, expect, it } from "vitest";
import { cleanOptions, combinations, planVariants, selectionKey } from "@/src/modules/catalog/matrix";

const size = { name: "Size", values: [{ value: "S" }, { value: "M" }] };
const colour = { name: "Colour", values: [{ value: "Red" }, { value: "Blue" }] };

describe("combinations", () => {
  it("returns the cartesian product in option order", () => {
    expect(combinations([size, colour])).toEqual([
      { Size: "S", Colour: "Red" },
      { Size: "S", Colour: "Blue" },
      { Size: "M", Colour: "Red" },
      { Size: "M", Colour: "Blue" },
    ]);
  });

  it("yields one empty selection when there are no options", () => {
    expect(combinations([])).toEqual([{}]);
  });
});

describe("planVariants", () => {
  const existing = [
    { selection: { Size: "S", Colour: "Red" }, data: "v1" },
    { selection: { Size: "M", Colour: "Red" }, data: "v2" },
  ];

  it("keeps matching variants, creates missing ones, removes orphans", () => {
    const plan = planVariants([size, colour], existing);
    expect(plan.keep.map((k) => k.data)).toEqual(["v1", "v2"]);
    expect(plan.keep.map((k) => k.title)).toEqual(["S / Red", "M / Red"]);
    expect(plan.create.map((c) => c.title)).toEqual(["S / Blue", "M / Blue"]);
    expect(plan.remove).toEqual([]);
  });

  it("removes variants whose value was deleted", () => {
    const plan = planVariants([{ name: "Size", values: [{ value: "S" }] }, colour], existing);
    expect(plan.keep.map((k) => k.data)).toEqual(["v1"]);
    expect(plan.remove).toEqual(["v2"]);
  });

  it("matches regardless of option order and retitles", () => {
    const plan = planVariants([colour, size], existing);
    expect(plan.keep.map((k) => `${k.data}:${k.title}:${k.position}`)).toEqual(["v1:Red / S:0", "v2:Red / M:1"]);
    expect(plan.create).toHaveLength(2);
  });

  it("collapses to a single Default variant when options are removed", () => {
    const plan = planVariants([], existing);
    expect(plan.keep).toEqual([]);
    expect(plan.create).toEqual([{ title: "Default", position: 0, selection: {} }]);
    expect(plan.remove).toEqual(["v1", "v2"]);
  });

  it("selectionKey is order-independent", () => {
    expect(selectionKey({ a: "1", b: "2" })).toBe(selectionKey({ b: "2", a: "1" }));
  });
});

describe("cleanOptions", () => {
  it("trims, drops blanks and dedupes case-insensitively", () => {
    expect(
      cleanOptions([
        { name: " Size ", values: [{ value: "S" }, { value: " s" }, { value: "" }, { value: "M" }] },
        { name: "size", values: [{ value: "L" }] },
        { name: "", values: [{ value: "x" }] },
        { name: "Empty", values: [{ value: " " }] },
      ]),
    ).toEqual([{ name: "Size", values: [{ value: "S" }, { value: "M" }] }]);
  });
});

import { describe, expect, it } from "vitest";
import { collectionQueryToParams, hasActiveFilters, parseCollectionQuery } from "@/src/modules/catalog/collection-query";

describe("parseCollectionQuery", () => {
  it("defaults to featured, page 1, no filters", () => {
    const q = parseCollectionQuery({});
    expect(q).toEqual({ sort: "featured", page: 1, minPrice: null, maxPrice: null, tags: [], inStockOnly: false, options: {} });
    expect(hasActiveFilters(q)).toBe(false);
  });

  it("reads sort, page, price, tags, stock and option filters (repeated or comma-separated)", () => {
    const q = parseCollectionQuery({ sort: "price-desc", page: "3", min: "1,000", max: "5000", tag: ["Audio", "desk"], stock: "in", Colour: ["Black", "Sand"], Size: "S,M" });
    expect(q.sort).toBe("price-desc");
    expect(q.page).toBe(3);
    expect(q.minPrice).toBe(1000);
    expect(q.maxPrice).toBe(5000);
    expect(q.tags).toEqual(["audio", "desk"]);
    expect(q.inStockOnly).toBe(true);
    expect(q.options).toEqual({ Colour: ["Black", "Sand"], Size: ["S", "M"] });
    expect(hasActiveFilters(q)).toBe(true);
  });

  it("rejects unknown sorts, bad pages and swaps an inverted price range", () => {
    const q = parseCollectionQuery({ sort: "rating", page: "-2", min: "900", max: "100" });
    expect(q.sort).toBe("featured");
    expect(q.page).toBe(1);
    expect(q.minPrice).toBe(100);
    expect(q.maxPrice).toBe(900);
  });

  it("round-trips through collectionQueryToParams", () => {
    const q = parseCollectionQuery({ sort: "title", page: "2", Colour: "Black", tag: "audio", stock: "in", min: "50" });
    const back = parseCollectionQuery(Object.fromEntries([...collectionQueryToParams(q).keys()].map((k) => [k, collectionQueryToParams(q).getAll(k)])));
    expect(back).toEqual(q);
  });
});

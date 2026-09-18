import { describe, expect, it } from "vitest";
import { collectionRulesSchema, parseRules, rulesToWhere } from "@/src/modules/catalog/rules";

describe("collectionRulesSchema", () => {
  it("accepts the seeded shapes", () => {
    expect(parseRules({ match: "all", conditions: [{ field: "tag", operator: "equals", value: "audio" }] })).not.toBeNull();
    expect(parseRules({ match: "all", conditions: [{ field: "compare_at_price", operator: "is_set", value: "" }] })).not.toBeNull();
  });

  it("rejects operators that do not fit the field and missing values", () => {
    const bad = collectionRulesSchema.safeParse({ match: "any", conditions: [{ field: "price", operator: "contains", value: "" }] });
    expect(bad.success).toBe(false);
    if (!bad.success) {
      const paths = bad.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("conditions.0.operator");
      expect(paths).toContain("conditions.0.value");
    }
    expect(collectionRulesSchema.safeParse({ match: "all", conditions: [] }).success).toBe(false);
    expect(parseRules(null)).toBeNull();
  });
});

describe("rulesToWhere", () => {
  it("builds a single condition without a wrapper", () => {
    expect(rulesToWhere({ match: "all", conditions: [{ field: "tag", operator: "equals", value: "Audio" }] })).toEqual({ tags: { has: "audio" } });
  });

  it("ANDs for all and ORs for any", () => {
    const conditions = [
      { field: "vendor" as const, operator: "equals" as const, value: "Volt" },
      { field: "price" as const, operator: "lt" as const, value: "2,000" },
    ];
    expect(rulesToWhere({ match: "all", conditions })).toEqual({
      AND: [{ vendor: { equals: "Volt", mode: "insensitive" } }, { variants: { some: { price: { lt: 200000 } } } }],
    });
    expect(rulesToWhere({ match: "any", conditions })).toHaveProperty("OR");
  });

  it("negates tag and vendor, and handles compare-at presence", () => {
    expect(rulesToWhere({ match: "all", conditions: [{ field: "tag", operator: "not_equals", value: "sale" }] })).toEqual({ NOT: { tags: { has: "sale" } } });
    expect(rulesToWhere({ match: "all", conditions: [{ field: "compare_at_price", operator: "is_not_set", value: "" }] })).toEqual({
      variants: { none: { compareAtPrice: { not: null } } },
    });
  });
});

// Rule-based collection membership. Pure: turns a CollectionRules value
// into a Prisma where-clause. Unit-tested directly.

import type { Prisma } from "@/src/generated/prisma/client";
import { z } from "zod";

export const RULE_FIELDS = ["tag", "vendor", "title", "price", "compare_at_price"] as const;
export type RuleField = (typeof RULE_FIELDS)[number];

export const RULE_OPERATORS = ["equals", "not_equals", "contains", "starts_with", "gt", "lt", "is_set", "is_not_set"] as const;
export type RuleOperator = (typeof RULE_OPERATORS)[number];

/** Which operators make sense for each field; the editor and validator share this. */
export const OPERATORS_FOR: Record<RuleField, readonly RuleOperator[]> = {
  tag: ["equals", "not_equals"],
  vendor: ["equals", "not_equals", "contains"],
  title: ["contains", "starts_with", "equals"],
  price: ["gt", "lt"],
  compare_at_price: ["is_set", "is_not_set"],
};

export const NEEDS_VALUE: Record<RuleOperator, boolean> = {
  equals: true,
  not_equals: true,
  contains: true,
  starts_with: true,
  gt: true,
  lt: true,
  is_set: false,
  is_not_set: false,
};

const conditionSchema = z
  .object({
    field: z.enum(RULE_FIELDS),
    operator: z.enum(RULE_OPERATORS),
    /** Text for tag/vendor/title; major-unit amount ("1299.50") for price. */
    value: z.string().trim().max(120).default(""),
  })
  .superRefine((c, ctx) => {
    if (!OPERATORS_FOR[c.field].includes(c.operator)) {
      ctx.addIssue({ code: "custom", message: `"${c.operator}" cannot be used with ${c.field}`, path: ["operator"] });
    }
    if (NEEDS_VALUE[c.operator] && c.value === "") {
      ctx.addIssue({ code: "custom", message: "Enter a value", path: ["value"] });
    }
    if (c.field === "price" && c.value !== "" && !/^\d{1,9}([.,]\d{1,2})?$/.test(c.value)) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 1299 or 1299.50", path: ["value"] });
    }
  });

export const collectionRulesSchema = z.object({
  match: z.enum(["all", "any"]),
  conditions: z.array(conditionSchema).min(1, "Add at least one condition").max(10, "At most 10 conditions"),
});

export type CollectionRules = z.infer<typeof collectionRulesSchema>;
export type RuleCondition = CollectionRules["conditions"][number];

/** Parse a stored JSON value; returns null when it is not valid rules. */
export function parseRules(value: unknown): CollectionRules | null {
  const parsed = collectionRulesSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function toMinor(major: string): number {
  return Math.round(Number(major.replace(",", "")) * 100);
}

function conditionWhere(c: RuleCondition): Prisma.ProductWhereInput {
  const v = c.value;
  switch (c.field) {
    case "tag": {
      const has: Prisma.ProductWhereInput = { tags: { has: v.toLowerCase() } };
      return c.operator === "equals" ? has : { NOT: has };
    }
    case "vendor":
      if (c.operator === "contains") return { vendor: { contains: v, mode: "insensitive" } };
      if (c.operator === "not_equals") return { NOT: { vendor: { equals: v, mode: "insensitive" } } };
      return { vendor: { equals: v, mode: "insensitive" } };
    case "title":
      if (c.operator === "starts_with") return { title: { startsWith: v, mode: "insensitive" } };
      if (c.operator === "equals") return { title: { equals: v, mode: "insensitive" } };
      return { title: { contains: v, mode: "insensitive" } };
    case "price":
      return { variants: { some: { price: c.operator === "gt" ? { gt: toMinor(v) } : { lt: toMinor(v) } } } };
    case "compare_at_price":
      return c.operator === "is_set" ? { variants: { some: { compareAtPrice: { not: null } } } } : { variants: { none: { compareAtPrice: { not: null } } } };
  }
}

/**
 * Where-clause for products matching the rules. Callers add their own
 * status filter (the storefront wants ACTIVE only; the admin preview wants
 * everything).
 */
export function rulesToWhere(rules: CollectionRules): Prisma.ProductWhereInput {
  const parts = rules.conditions.map(conditionWhere);
  if (parts.length === 1) return parts[0] ?? {};
  return rules.match === "all" ? { AND: parts } : { OR: parts };
}

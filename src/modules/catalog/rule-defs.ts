// Collection rule vocabulary. Browser-safe: shared by the admin editor and the zod validator.

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

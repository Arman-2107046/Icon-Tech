// Public API of the catalog module.
// Other modules import ONLY from this file — never from internals.
export * from "./queries";
export * from "./actions";
export * from "./types";
export { selectionKey, combinations, planVariants, cleanOptions } from "./matrix";
export { rulesToWhere } from "./rules";
export * from "./storefront";

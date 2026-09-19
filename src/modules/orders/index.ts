// Public API of the orders module.
// Other modules import ONLY from this file — never from internals.
export * from "./queries";
export * from "./actions";
export * from "./types";
export { createOrderFromCart, OrderError, type AddressSnapshot, type CreateOrderInput } from "./service";
export * from "./state-machine";

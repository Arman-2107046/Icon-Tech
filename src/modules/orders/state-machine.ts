// Order lifecycle. Pure and unit-tested; the service layer enforces it.

import type { OrderStatus } from "@/src/generated/prisma/enums";

/**
 *   PENDING ──► PAID ──► FULFILLED ──► COMPLETED
 *      │          │           │
 *      ▼          ▼           ▼
 *  CANCELLED   REFUNDED    REFUNDED
 *
 * COD orders may be fulfilled while still PENDING (cash arrives with the
 * parcel), so PENDING → FULFILLED is allowed as well.
 */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["PAID", "FULFILLED", "CANCELLED"],
  PAID: ["FULFILLED", "REFUNDED", "CANCELLED"],
  FULFILLED: ["COMPLETED", "REFUNDED", "PAID"],
  COMPLETED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export class IllegalTransition extends Error {
  constructor(
    readonly from: OrderStatus,
    readonly to: OrderStatus,
  ) {
    super(`Cannot move an order from ${from} to ${to}`);
    this.name = "IllegalTransition";
  }
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Returns `to` or throws IllegalTransition. Same-state is a no-op. */
export function assertTransition(from: OrderStatus, to: OrderStatus): OrderStatus {
  if (from === to) return to;
  if (!canTransition(from, to)) throw new IllegalTransition(from, to);
  return to;
}

export function nextStatuses(from: OrderStatus): readonly OrderStatus[] {
  return TRANSITIONS[from];
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  FULFILLED: "Fulfilled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

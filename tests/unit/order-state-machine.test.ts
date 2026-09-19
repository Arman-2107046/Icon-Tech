import { describe, expect, it } from "vitest";
import { assertTransition, canTransition, IllegalTransition, nextStatuses } from "@/src/modules/orders/state-machine";

describe("order state machine", () => {
  it("allows the happy path and the COD shortcut", () => {
    expect(assertTransition("PENDING", "PAID")).toBe("PAID");
    expect(assertTransition("PAID", "FULFILLED")).toBe("FULFILLED");
    expect(assertTransition("FULFILLED", "COMPLETED")).toBe("COMPLETED");
    expect(canTransition("PENDING", "FULFILLED")).toBe(true);
  });

  it("throws on illegal moves and terminal states", () => {
    expect(() => assertTransition("COMPLETED", "PENDING")).toThrow(IllegalTransition);
    expect(() => assertTransition("CANCELLED", "PAID")).toThrow(IllegalTransition);
    expect(() => assertTransition("REFUNDED", "FULFILLED")).toThrow(IllegalTransition);
    expect(nextStatuses("CANCELLED")).toEqual([]);
  });

  it("treats same-state as a no-op", () => {
    expect(assertTransition("PAID", "PAID")).toBe("PAID");
  });
});

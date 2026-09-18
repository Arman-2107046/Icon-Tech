import { describe, expect, it } from "vitest";
import { add, formatMoney, money } from "@/src/lib/money";
import { fail, ok } from "@/src/lib/action-result";

describe("test harness", () => {
  it("resolves the @ alias and imports lib modules", () => {
    expect(add(money(100), money(250))).toEqual({ amount: 350, currency: "BDT" });
    expect(formatMoney(money(129900))).toBe("৳1,299.00");
  });

  it("builds action results", () => {
    expect(ok(1)).toEqual({ ok: true, data: 1 });
    expect(fail("nope")).toEqual({ ok: false, error: "nope" });
  });
});

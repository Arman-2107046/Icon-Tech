import { describe, expect, it } from "vitest";
import { normalisePath } from "@/src/lib/redirects";

describe("normalisePath", () => {
  it("lower-cases and strips trailing slashes, keeping root", () => {
    expect(normalisePath("/Old-Keyboards/")).toBe("/old-keyboards");
    expect(normalisePath("/")).toBe("/");
    expect(normalisePath("/a//")).toBe("/a");
  });
});

import { describe, expect, it } from "vitest";
import { parseTableParams, skipTake } from "@/src/admin/lib/table-params";

describe("parseTableParams", () => {
  it("applies defaults for an empty query", () => {
    const p = parseTableParams({}, { defaultSort: "createdAt" });
    expect(p).toEqual({ q: "", page: 1, perPage: 25, sort: "createdAt", dir: "desc", filters: {} });
  });

  it("reads page, per, sort, dir, q and declared filters", () => {
    const p = parseTableParams(
      { q: " aria ", page: "3", per: "50", sort: "title", dir: "asc", status: "ACTIVE", rogue: "x" },
      { filterKeys: ["status"], sortable: ["title", "createdAt"] },
    );
    expect(p).toEqual({ q: "aria", page: 3, perPage: 50, sort: "title", dir: "asc", filters: { status: "ACTIVE" } });
    expect(skipTake(p)).toEqual({ skip: 100, take: 50 });
  });

  it("rejects bad page sizes, unknown sort keys and garbage pages", () => {
    const p = parseTableParams(
      { page: "-4", per: "999", sort: "password_hash", dir: "sideways" },
      { defaultSort: "createdAt", sortable: ["createdAt"] },
    );
    expect(p.page).toBe(1);
    expect(p.perPage).toBe(25);
    expect(p.sort).toBe("createdAt");
    expect(p.dir).toBe("desc");
  });

  it("takes the first value of repeated params", () => {
    expect(parseTableParams({ q: ["one", "two"] }).q).toBe("one");
  });
});

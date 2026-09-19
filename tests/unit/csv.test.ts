import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "@/src/lib/csv";

describe("csv", () => {
  it("quotes commas, quotes and newlines, and escapes formula prefixes", () => {
    const out = toCsv(["a", "b"], [["x,y", 'say "hi"'], ["=SUM(1)", "line\nbreak"], [null, 3]]);
    expect(out).toBe('a,b\r\n"x,y","say ""hi"""\r\n\'=SUM(1),"line\nbreak"\r\n,3\r\n');
  });

  it("parses what it writes, including a BOM and CRLF", () => {
    const text = "\uFEFF" + toCsv(["Handle", "Title"], [["a-1", 'Quoted, "thing"'], ["b-2", "multi\nline"]]);
    const { headers, records } = parseCsv(text);
    expect(headers).toEqual(["handle", "title"]);
    expect(records).toEqual([
      { handle: "a-1", title: 'Quoted, "thing"' },
      { handle: "b-2", title: "multi\nline" },
    ]);
  });

  it("skips blank lines and tolerates short rows", () => {
    const { records } = parseCsv("a,b,c\n1,2\n\n4,5,6\n");
    expect(records).toEqual([
      { a: "1", b: "2", c: "" },
      { a: "4", b: "5", c: "6" },
    ]);
  });
});

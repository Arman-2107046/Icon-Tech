#!/usr/bin/env node
/**
 * Fails when a literal colour appears anywhere outside the token files.
 * Scans app/ and src/ for hex (#fff, #1a1917, #rrggbbaa), rgb()/hsl()/oklch()
 * in .css, .ts and .tsx files. TS/TSX are also covered by ESLint; this
 * script exists mainly for CSS, and as the single CI gate.
 *
 * Allowed:
 *   app/tokens.css   the storefront token source of truth
 *   app/globals.css  shadcn's admin theme (admin is exempt from the storefront rules)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SCAN = ["app", "src"];
const ALLOW = new Set(["app/tokens.css", "app/globals.css"]);
const SKIP_DIRS = new Set(["node_modules", ".next", "generated"]);
const EXT = /\.(css|ts|tsx)$/;

const HEX = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi;
const FUNC = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\(/g;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (EXT.test(entry)) yield full;
  }
}

const findings = [];
for (const base of SCAN) {
  for (const file of walk(join(ROOT, base))) {
    const rel = relative(ROOT, file).split(sep).join("/");
    if (ALLOW.has(rel)) continue;
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      // Ignore comments and hash-only anchors/ids like "#result" (not hex-shaped).
      const code = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
      for (const m of code.matchAll(HEX)) findings.push(`${rel}:${i + 1}: ${m[0]}`);
      for (const m of code.matchAll(FUNC)) findings.push(`${rel}:${i + 1}: ${m[0]}…)`);
    });
  }
}

if (findings.length) {
  console.error("Hardcoded colours found (use tokens.css / token utilities instead):");
  for (const f of findings) console.error("  " + f);
  process.exit(1);
}
console.log("check-colors: no hardcoded colours outside token files.");

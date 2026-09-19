// Client JS budget: gzipped bytes of every script the product page loads.
// Usage: node scripts/check-bundle.mjs [baseUrl] [path] [budgetKB]
// Run against `next start` (dev bundles are unminified and much larger).
import { gzipSync } from "node:zlib";

const base = process.argv[2] ?? "http://localhost:3000";
const path = process.argv[3] ?? "/products/porter-tech-backpack";
const budgetKb = Number(process.argv[4] ?? 180);

const html = await (await fetch(base + path)).text();
const urls = new Set();
// `nomodule` polyfills are only fetched by legacy browsers; modern ones never download them.
const legacy = new Set();
for (const m of html.matchAll(/<script([^>]+)>/g)) {
  const src = /src="([^"]+)"/.exec(m[1]);
  if (!src) continue;
  if (/nomodule/i.test(m[1])) legacy.add(src[1]);
  else urls.add(src[1]);
}
for (const m of html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)) urls.add(m[1]);
// Next also loads chunks via a JSON list inside inline scripts: `"/_next/static/chunks/…js"`.
for (const m of html.matchAll(/"(\/_next\/static\/chunks\/[^"]+\.js)"/g)) urls.add(m[1]);
for (const l of legacy) urls.delete(l);

let total = 0;
const rows = [];
for (const u of urls) {
  if (!u.startsWith("/_next/static/") || !u.endsWith(".js")) continue;
  const res = await fetch(base + u);
  if (!res.ok) continue;
  const bytes = gzipSync(Buffer.from(await res.arrayBuffer())).length;
  total += bytes;
  rows.push([u, bytes]);
}
rows.sort((a, b) => b[1] - a[1]);
for (const [u, b] of rows) console.log(`${String((b / 1024).toFixed(1)).padStart(7)} KB  ${u}`);
const kb = total / 1024;
console.log(`\n${path}: ${rows.length} scripts, ${kb.toFixed(1)} KB gzipped (budget ${budgetKb} KB)`);
if (kb > budgetKb) {
  console.error(`Budget exceeded by ${(kb - budgetKb).toFixed(1)} KB`);
  process.exit(1);
}

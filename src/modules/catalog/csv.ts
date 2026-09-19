// Product CSV import/export. Server only; one row per variant.
import "server-only";

import { z } from "zod";
import { db } from "@/src/lib/db";
import { fromMajorUnits, money, toMajorUnits } from "@/src/lib/money";
import { type CsvRecord } from "@/src/lib/csv";
import { PRODUCT_STATUSES, slugify, type ImportSummary } from "./types";

export const PRODUCT_CSV_HEADERS = ["handle", "title", "status", "vendor", "tags", "description", "variant_title", "options", "sku", "barcode", "price", "compare_at_price", "cost", "weight_grams", "available"] as const;

const major = (minor: number | null) => (minor === null ? "" : toMajorUnits(money(minor)).toFixed(2));

export async function productCsvRows(): Promise<(string | number)[][]> {
  const products = await db.product.findMany({
    orderBy: { createdAt: "asc" },
    include: { variants: { orderBy: { position: "asc" }, include: { inventory: true, optionValues: { include: { optionValue: { include: { option: true } } } } } } },
  });
  const rows: (string | number)[][] = [];
  for (const p of products) {
    for (const v of p.variants) {
      const options = v.optionValues
        .sort((a, b) => a.optionValue.option.position - b.optionValue.option.position)
        .map((ov) => `${ov.optionValue.option.name}=${ov.optionValue.value}`)
        .join("; ");
      rows.push([p.handle, p.title, p.status, p.vendor ?? "", p.tags.join(", "), p.description, v.title, options, v.sku ?? "", v.barcode ?? "", major(v.price), major(v.compareAtPrice), major(v.cost), v.weightGrams ?? "", v.inventory?.available ?? 0]);
    }
  }
  return rows;
}

// ---- import -------------------------------------------------------------------------

const moneyText = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 1250 or 1250.50");
const optionalMoney = z.string().trim().transform((v) => (v === "" ? null : v)).pipe(moneyText.nullable());
const optionalInt = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v)))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 0), "Must be a whole number");

const rowSchema = z.object({
  handle: z.string().trim().max(120),
  title: z.string().trim().max(200),
  status: z.string().trim().toUpperCase(),
  vendor: z.string().trim().max(120),
  tags: z.string().trim(),
  description: z.string(),
  variant_title: z.string().trim().max(120),
  options: z.string().trim(),
  sku: z.string().trim().max(64),
  barcode: z.string().trim().max(64),
  price: moneyText,
  compare_at_price: optionalMoney,
  cost: optionalMoney,
  weight_grams: optionalInt,
  available: optionalInt,
});
type Row = z.infer<typeof rowSchema>;


function parseOptions(text: string): { name: string; value: string }[] {
  if (!text) return [];
  return text
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [name, ...rest] = pair.split("=");
      return { name: (name ?? "").trim(), value: rest.join("=").trim() };
    });
}

/**
 * Upsert products and variants from CSV records. Products match on handle;
 * variants match on SKU (or, without a SKU, on option values within the
 * product). All-or-nothing: any validation issue aborts before writing.
 * `dryRun` validates and reports without touching the database.
 */
export async function importProductCsv(records: CsvRecord[], headers: string[], dryRun: boolean): Promise<ImportSummary> {
  const summary: ImportSummary = { dryRun, productsCreated: 0, productsUpdated: 0, variantsCreated: 0, variantsUpdated: 0, issues: [] };
  const has = (column: string) => headers.includes(column);
  const missing = ["handle", "title", "price"].filter((h) => !headers.includes(h));
  if (missing.length) {
    summary.issues.push({ line: 1, message: `Missing required column(s): ${missing.join(", ")}` });
    return summary;
  }

  const rows: { line: number; row: Row }[] = [];
  records.forEach((rec, i) => {
    const line = i + 2;
    const parsed = rowSchema.safeParse({
      handle: rec.handle ?? "",
      title: rec.title ?? "",
      status: rec.status || "DRAFT",
      vendor: rec.vendor ?? "",
      tags: rec.tags ?? "",
      description: rec.description ?? "",
      variant_title: rec.variant_title ?? "",
      options: rec.options ?? "",
      sku: rec.sku ?? "",
      barcode: rec.barcode ?? "",
      price: rec.price ?? "",
      compare_at_price: rec.compare_at_price ?? "",
      cost: rec.cost ?? "",
      weight_grams: rec.weight_grams ?? "",
      available: rec.available ?? "",
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) summary.issues.push({ line, message: `${issue.path.join(".")}: ${issue.message}` });
      return;
    }
    const row = parsed.data;
    if (!row.handle && !row.title) summary.issues.push({ line, message: "handle or title is required" });
    if (!(PRODUCT_STATUSES as readonly string[]).includes(row.status)) summary.issues.push({ line, message: `status must be one of ${PRODUCT_STATUSES.join(", ")}` });
    if (parseOptions(row.options).some((o) => !o.name || !o.value)) summary.issues.push({ line, message: "options must look like Colour=Navy; Size=M" });
    rows.push({ line, row: { ...row, handle: row.handle || slugify(row.title) } });
  });

  // Duplicate SKUs inside the file would race each other.
  const seen = new Map<string, number>();
  for (const { line, row } of rows) {
    if (!row.sku) continue;
    const first = seen.get(row.sku);
    if (first) summary.issues.push({ line, message: `sku ${row.sku} also appears on line ${first}` });
    else seen.set(row.sku, line);
  }
  if (summary.issues.length) return summary;

  // Group by handle so product fields come from the first row of each group.
  const groups = new Map<string, { line: number; row: Row }[]>();
  for (const r of rows) groups.set(r.row.handle, [...(groups.get(r.row.handle) ?? []), r]);

  // Count what would happen (also used for the dry-run report).
  const existing = await db.product.findMany({ where: { handle: { in: [...groups.keys()] } }, select: { id: true, handle: true, variants: { select: { id: true, sku: true, optionValues: { select: { optionValue: { select: { value: true, option: { select: { name: true } } } } } } } } } });
  const byHandle = new Map(existing.map((p) => [p.handle, p]));
  const skuOwners = new Map((await db.variant.findMany({ where: { sku: { in: [...seen.keys()] } }, select: { sku: true, productId: true } })).flatMap((v) => (v.sku ? [[v.sku, v.productId] as const] : [])));

  for (const [handle, group] of groups) {
    const product = byHandle.get(handle);
    if (product) summary.productsUpdated++;
    else summary.productsCreated++;
    for (const { line, row } of group) {
      const owner = row.sku ? skuOwners.get(row.sku) : undefined;
      if (owner && product && owner !== product.id) summary.issues.push({ line, message: `sku ${row.sku} belongs to a different product` });
      if (owner && !product) summary.issues.push({ line, message: `sku ${row.sku} already exists on another product` });
      const match = product ? findVariant(product.variants, row) : undefined;
      if (match) summary.variantsUpdated++;
      else summary.variantsCreated++;
    }
  }
  if (summary.issues.length || dryRun) return summary;

  await db.$transaction(async (tx) => {
    for (const [handle, group] of groups) {
      const head = group[0]?.row;
      if (!head) continue;
      // Only columns present in the file are written; absent ones keep their values.
      const productData = {
        title: head.title || handle,
        ...(has("status") ? { status: head.status as (typeof PRODUCT_STATUSES)[number] } : {}),
        ...(has("vendor") ? { vendor: head.vendor || null } : {}),
        ...(has("tags") ? { tags: head.tags ? head.tags.split(",").map((t) => t.trim()).filter(Boolean) : [] } : {}),
        ...(has("description") ? { description: head.description } : {}),
      };
      const existingProduct = byHandle.get(handle);
      const product = existingProduct
        ? await tx.product.update({ where: { id: existingProduct.id }, data: productData, select: { id: true } })
        : await tx.product.create({ data: { ...productData, handle, status: (head.status as (typeof PRODUCT_STATUSES)[number]) ?? "DRAFT" }, select: { id: true } });

      let position = existingProduct ? existingProduct.variants.length : 0;
      for (const { row } of group) {
        const opts = parseOptions(row.options);
        const price = fromMajorUnits(row.price).amount;
        const title = row.variant_title || (opts.length ? opts.map((o) => o.value).join(" / ") : "Default");
        const data = {
          price,
          ...(row.sku ? { sku: row.sku } : {}),
          ...(has("barcode") ? { barcode: row.barcode || null } : {}),
          ...(has("compare_at_price") ? { compareAtPrice: row.compare_at_price ? fromMajorUnits(row.compare_at_price).amount : null } : {}),
          ...(has("cost") ? { cost: row.cost ? fromMajorUnits(row.cost).amount : null } : {}),
          ...(has("weight_grams") ? { weightGrams: row.weight_grams } : {}),
        };
        const match = existingProduct ? findVariant(existingProduct.variants, row) : undefined;
        const variant = match
          ? await tx.variant.update({ where: { id: match.id }, data: { ...data, ...(row.variant_title || opts.length ? { title } : {}) }, select: { id: true } })
          : await tx.variant.create({ data: { ...data, title, sku: row.sku || null, productId: product.id, position: position++ }, select: { id: true } });
        if (row.available !== null) {
          await tx.inventoryItem.upsert({ where: { variantId: variant.id }, create: { variantId: variant.id, available: row.available, reserved: 0 }, update: { available: row.available } });
        }
        if (!match && opts.length) {
          for (const [i, o] of opts.entries()) {
            const option = await tx.productOption.upsert({ where: { productId_name: { productId: product.id, name: o.name } }, create: { productId: product.id, name: o.name, position: i }, update: {} });
            const count = await tx.productOptionValue.count({ where: { optionId: option.id } });
            const value = await tx.productOptionValue.upsert({ where: { optionId_value: { optionId: option.id, value: o.value } }, create: { optionId: option.id, value: o.value, position: count }, update: {} });
            await tx.variantOptionValue.create({ data: { variantId: variant.id, optionValueId: value.id } });
          }
        }
      }
    }
  });
  return summary;
}

type ExistingVariant = { id: string; sku: string | null; optionValues: { optionValue: { value: string; option: { name: string } } }[] };

function findVariant(variants: ExistingVariant[], row: Row): ExistingVariant | undefined {
  if (row.sku) return variants.find((v) => v.sku === row.sku);
  const wanted = parseOptions(row.options).map((o) => `${o.name}=${o.value}`).sort().join("|");
  return variants.find((v) => v.optionValues.map((ov) => `${ov.optionValue.option.name}=${ov.optionValue.value}`).sort().join("|") === wanted);
}

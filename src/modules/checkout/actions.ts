"use server";

// checkout module — Server Actions. Every action returns an ActionResult; never throws.

import { type ActionResult, fail, failFromZod, ok, runAction } from "@/src/lib/action-result";
import { assertAdmin } from "@/src/lib/auth/guards";
import { db } from "@/src/lib/db";
import { isUniqueViolation } from "@/src/lib/db-errors";
import { fromMajorUnits } from "@/src/lib/money";
import { shippingRateInputSchema, shippingZoneInputSchema, taxRateInputSchema } from "./types";

// ---- shipping zones ---------------------------------------------------------

function readZone(formData: FormData) {
  return shippingZoneInputSchema.safeParse({ name: formData.get("name") ?? "", countries: formData.get("countries") ?? "" });
}

/** A country may belong to one zone only; report the clash on the field. */
async function countryClash(countries: string[], exceptZoneId?: string): Promise<string | null> {
  const zones = await db.shippingZone.findMany({ where: exceptZoneId ? { id: { not: exceptZoneId } } : {}, select: { name: true, countries: true } });
  for (const zone of zones) {
    const hit = countries.find((c) => zone.countries.includes(c));
    if (hit) return `${hit} is already in the "${zone.name}" zone`;
  }
  return null;
}

export async function createShippingZone(_prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const parsed = readZone(formData);
    if (!parsed.success) return failFromZod(parsed.error);
    const clash = await countryClash(parsed.data.countries);
    if (clash) return fail("Please fix the highlighted fields.", { countries: clash });
    const position = await db.shippingZone.count();
    await db.shippingZone.create({ data: { ...parsed.data, position } });
    return ok(null);
  });
}

export async function updateShippingZone(zoneId: string, _prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const parsed = readZone(formData);
    if (!parsed.success) return failFromZod(parsed.error);
    const clash = await countryClash(parsed.data.countries, zoneId);
    if (clash) return fail("Please fix the highlighted fields.", { countries: clash });
    await db.shippingZone.update({ where: { id: zoneId }, data: parsed.data });
    return ok(null);
  });
}

export async function deleteShippingZone(zoneId: string): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    await db.shippingZone.delete({ where: { id: zoneId } });
    return ok(null);
  });
}

// ---- shipping rates ---------------------------------------------------------

function readRate(formData: FormData) {
  const parsed = shippingRateInputSchema.safeParse({
    name: formData.get("name") ?? "",
    price: formData.get("price") ?? "",
    minOrderSubtotal: formData.get("minOrderSubtotal") ?? "",
    maxOrderSubtotal: formData.get("maxOrderSubtotal") ?? "",
  });
  if (!parsed.success) return { ok: false as const, error: parsed.error };
  const min = parsed.data.minOrderSubtotal ? fromMajorUnits(parsed.data.minOrderSubtotal).amount : null;
  const max = parsed.data.maxOrderSubtotal ? fromMajorUnits(parsed.data.maxOrderSubtotal).amount : null;
  if (min !== null && max !== null && max < min) {
    return { ok: false as const, fieldErrors: { maxOrderSubtotal: "Maximum must be at least the minimum" } };
  }
  return { ok: true as const, data: { name: parsed.data.name, price: fromMajorUnits(parsed.data.price).amount, minOrderSubtotal: min, maxOrderSubtotal: max } };
}

export async function createShippingRate(zoneId: string, _prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const read = readRate(formData);
    if (!read.ok) return read.error ? failFromZod(read.error) : fail("Please fix the highlighted fields.", read.fieldErrors);
    const position = await db.shippingRate.count({ where: { zoneId } });
    await db.shippingRate.create({ data: { ...read.data, zoneId, position } });
    return ok(null);
  });
}

export async function updateShippingRate(rateId: string, _prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const read = readRate(formData);
    if (!read.ok) return read.error ? failFromZod(read.error) : fail("Please fix the highlighted fields.", read.fieldErrors);
    await db.shippingRate.update({ where: { id: rateId }, data: read.data });
    return ok(null);
  });
}

export async function deleteShippingRate(rateId: string): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    await db.shippingRate.delete({ where: { id: rateId } });
    return ok(null);
  });
}

// ---- tax rates --------------------------------------------------------------

function readTax(formData: FormData) {
  return taxRateInputSchema.safeParse({
    name: formData.get("name") ?? "",
    country: formData.get("country") ?? "",
    region: formData.get("region") ?? "",
    rate: formData.get("rate") ?? "",
  });
}

const DUPLICATE_TAX = "A rate for this country and region already exists";

export async function createTaxRate(_prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const parsed = readTax(formData);
    if (!parsed.success) return failFromZod(parsed.error);
    const { rate, ...rest } = parsed.data;
    try {
      await db.taxRate.create({ data: { ...rest, rateBps: Math.round(Number(rate) * 100) } });
      return ok(null);
    } catch (error) {
      if (isUniqueViolation(error, "country")) return fail("Please fix the highlighted fields.", { region: DUPLICATE_TAX });
      throw error;
    }
  });
}

export async function updateTaxRate(taxRateId: string, _prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const parsed = readTax(formData);
    if (!parsed.success) return failFromZod(parsed.error);
    const { rate, ...rest } = parsed.data;
    try {
      await db.taxRate.update({ where: { id: taxRateId }, data: { ...rest, rateBps: Math.round(Number(rate) * 100) } });
      return ok(null);
    } catch (error) {
      if (isUniqueViolation(error, "country")) return fail("Please fix the highlighted fields.", { region: DUPLICATE_TAX });
      throw error;
    }
  });
}

export async function deleteTaxRate(taxRateId: string): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    await db.taxRate.delete({ where: { id: taxRateId } });
    return ok(null);
  });
}

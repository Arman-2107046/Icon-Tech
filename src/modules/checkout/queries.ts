// checkout module — read-side queries. Server only; imported via ./index.ts.
import "server-only";

import { db } from "@/src/lib/db";

export async function listShippingZones() {
  return db.shippingZone.findMany({
    orderBy: { position: "asc" },
    include: { rates: { orderBy: { position: "asc" } } },
  });
}
export type ShippingZoneWithRates = Awaited<ReturnType<typeof listShippingZones>>[number];

export async function listTaxRates() {
  return db.taxRate.findMany({ orderBy: [{ country: "asc" }, { region: "asc" }] });
}
export type TaxRateRow = Awaited<ReturnType<typeof listTaxRates>>[number];

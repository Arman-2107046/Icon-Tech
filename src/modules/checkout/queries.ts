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

// ---- checkout state ---------------------------------------------------------

import { cookies } from "next/headers";
import { getCustomerSession } from "@/src/lib/auth/session";
import { getCart, readCartToken } from "@/src/modules/cart";
import { resolveCartDiscounts } from "@/src/modules/discounts";
import type { AppliedDiscount } from "@/src/modules/discounts/types";
import type { CartView } from "@/src/modules/cart/types";
import { computeTotals, eligibleRates, pickTaxBps, type Totals } from "./totals";
import { checkoutDataSchema, type CheckoutData, type CheckoutStep } from "./types";

export type ShippingChoice = { id: string; name: string; price: number };

export type CheckoutState = {
  cart: CartView;
  data: CheckoutData;
  /** Highest step the customer may open; earlier steps are always editable. */
  reachable: CheckoutStep;
  rates: ShippingChoice[];
  selectedRate: ShippingChoice | null;
  taxBps: number;
  totals: Totals;
  /** Codes that survived validation, with what each takes off. */
  discounts: AppliedDiscount[];
  savedAddresses: { id: string; label: string; address: Record<string, string | null> }[];
  customer: { id: string; email: string; firstName: string; lastName: string } | null;
};

export async function readCheckoutData(): Promise<CheckoutData> {
  const token = await readCartToken();
  if (!token) return { step: "contact", discountCodes: [] };
  const cart = await db.cart.findFirst({ where: { token, status: "ACTIVE" }, select: { checkoutData: true } });
  const parsed = checkoutDataSchema.safeParse(cart?.checkoutData ?? {});
  return parsed.success ? parsed.data : { step: "contact", discountCodes: [] };
}

/** Rates the customer may pick given a country and discounted subtotal. */
export async function resolveShippingRates(country: string, taxable: number): Promise<ShippingChoice[]> {
  const zone = await db.shippingZone.findFirst({ where: { countries: { has: country } }, include: { rates: { orderBy: { position: "asc" } } } });
  if (!zone) return [];
  return eligibleRates(zone.rates, taxable).map((r) => ({ id: r.id, name: r.name, price: r.price }));
}

export async function resolveTaxBps(country: string, region: string | null): Promise<number> {
  const rates = await db.taxRate.findMany({ where: { country } });
  return pickTaxBps(rates, country, region);
}

function furthestStep(data: CheckoutData, cart: CartView, rateValid: boolean): CheckoutStep {
  if (cart.lines.length === 0) return "contact";
  if (!data.contact) return "contact";
  if (!data.shippingAddress) return "address";
  if (!data.shippingRateId || !rateValid) return "shipping";
  return "payment";
}

/** Everything the checkout page needs, computed fresh from the DB. */
export async function getCheckoutState(): Promise<CheckoutState> {
  const [cart, data, session] = await Promise.all([getCart(), readCheckoutData(), getCustomerSession()]);
  const country = data.shippingAddress?.country ?? null;
  const region = data.shippingAddress?.region ?? null;

  const discount = await resolveCartDiscounts(data.discountCodes, { subtotal: cart.subtotal, customerId: session?.customer.id ?? null });
  const provisional = computeTotals({ subtotal: cart.subtotal, discount: discount.amount, shipping: 0, taxBps: 0 });

  const rates = country ? await resolveShippingRates(country, provisional.taxable) : [];
  const selectedRate = rates.find((r) => r.id === data.shippingRateId) ?? null;
  const taxBps = country ? await resolveTaxBps(country, region) : 0;
  const totals = computeTotals({ subtotal: cart.subtotal, discount: discount.amount, shipping: selectedRate?.price ?? 0, taxBps, freeShipping: discount.freeShipping });

  const savedAddresses = session
    ? (await db.address.findMany({ where: { customerId: session.customer.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] })).map((a) => ({
        id: a.id,
        label: `${a.firstName} ${a.lastName}, ${a.line1}, ${a.city}`,
        address: { firstName: a.firstName, lastName: a.lastName, company: a.company, line1: a.line1, line2: a.line2, city: a.city, region: a.region, postalCode: a.postalCode, country: a.country, phone: a.phone },
      }))
    : [];

  return {
    cart,
    data,
    reachable: furthestStep(data, cart, selectedRate !== null),
    rates,
    selectedRate,
    taxBps,
    totals,
    discounts: discount.applied,
    savedAddresses,
    customer: session?.customer ?? null,
  };
}

// ---- order confirmation access ---------------------------------------------

export const LAST_ORDER_COOKIE = "icon_last_order";

/** Guests may view the order they just placed; customers may view their own. */
export async function canViewOrder(orderId: string): Promise<boolean> {
  const store = await cookies();
  if (store.get(LAST_ORDER_COOKIE)?.value === orderId) return true;
  const session = await getCustomerSession();
  if (!session) return false;
  const order = await db.order.findUnique({ where: { id: orderId }, select: { customerId: true } });
  return order?.customerId === session.customer.id;
}

export async function getOrderForConfirmation(orderId: string) {
  return db.order.findUnique({ where: { id: orderId }, include: { items: { orderBy: { title: "asc" } }, payments: true } });
}

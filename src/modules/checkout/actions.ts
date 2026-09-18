"use server";

// checkout module — Server Actions. Every action returns an ActionResult; never throws.

import { updateTag } from "next/cache";
import { type ActionResult, fail, failFromZod, ok, runAction, zodFieldErrors } from "@/src/lib/action-result";
import { tags } from "@/src/lib/cache-tags";
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
    updateTag(tags.shipping);
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
    updateTag(tags.shipping);
    return ok(null);
  });
}

export async function deleteShippingZone(zoneId: string): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    await db.shippingZone.delete({ where: { id: zoneId } });
    updateTag(tags.shipping);
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
    updateTag(tags.shipping);
    return ok(null);
  });
}

export async function updateShippingRate(rateId: string, _prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const read = readRate(formData);
    if (!read.ok) return read.error ? failFromZod(read.error) : fail("Please fix the highlighted fields.", read.fieldErrors);
    await db.shippingRate.update({ where: { id: rateId }, data: read.data });
    updateTag(tags.shipping);
    return ok(null);
  });
}

export async function deleteShippingRate(rateId: string): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    await db.shippingRate.delete({ where: { id: rateId } });
    updateTag(tags.shipping);
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

/**
 * The (country, region) unique index does not catch two country-wide rows
 * because Postgres treats NULL regions as distinct, so check explicitly.
 */
async function taxRateExists(country: string, region: string | null, exceptId?: string): Promise<boolean> {
  const hit = await db.taxRate.findFirst({
    where: { country, region: region ?? null, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  return hit !== null;
}

export async function createTaxRate(_prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    await assertAdmin();
    const parsed = readTax(formData);
    if (!parsed.success) return failFromZod(parsed.error);
    const { rate, ...rest } = parsed.data;
    if (await taxRateExists(rest.country, rest.region)) return fail("Please fix the highlighted fields.", { region: DUPLICATE_TAX });
    try {
      await db.taxRate.create({ data: { ...rest, rateBps: Math.round(Number(rate) * 100) } });
      updateTag(tags.shipping);
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
    if (await taxRateExists(rest.country, rest.region, taxRateId)) return fail("Please fix the highlighted fields.", { region: DUPLICATE_TAX });
    try {
      await db.taxRate.update({ where: { id: taxRateId }, data: { ...rest, rateBps: Math.round(Number(rate) * 100) } });
      updateTag(tags.shipping);
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
    updateTag(tags.shipping);
    return ok(null);
  });
}

// ---- checkout flow ----------------------------------------------------------

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/src/lib/auth/session";
import { env } from "@/src/lib/env";
import { clearCartCookie, findActiveCartByToken, readCartToken } from "@/src/modules/cart";
import { createOrderFromCart, OrderError } from "@/src/modules/orders";
import { reserveCart } from "./inventory";
import { getPaymentProvider } from "./payments";
import { getCheckoutState, LAST_ORDER_COOKIE, readCheckoutData, resolveShippingRates } from "./queries";
import { addressSchema, contactSchema, type CheckoutData, type CheckoutStep } from "./types";

async function activeCart() {
  const token = await readCartToken();
  if (!token) return null;
  return findActiveCartByToken(token);
}

/** After a save, open the earliest step that still needs input (payment when all are done). */
function nextIncomplete(d: CheckoutData): CheckoutStep {
  if (!d.contact) return "contact";
  if (!d.shippingAddress) return "address";
  if (!d.shippingRateId) return "shipping";
  return "payment";
}

async function saveData(cartId: string, patch: (current: CheckoutData) => CheckoutData): Promise<void> {
  const current = await readCheckoutData();
  await db.cart.update({ where: { id: cartId }, data: { checkoutData: patch(current) } });
}

/**
 * Called when /checkout renders: (re)reserve stock for the cart. When a
 * line cannot be fully held it is capped and the customer is told.
 */
export async function startCheckout(): Promise<ActionResult<{ adjusted: string[] }>> {
  return runAction(async () => {
    const cart = await activeCart();
    if (!cart || cart.items.length === 0) return ok({ adjusted: [] });
    let outcome = await reserveCart(cart.id);
    const adjusted: string[] = [];
    if (!outcome.ok) {
      for (const s of outcome.shortages) {
        if (s.sellable <= 0) await db.cartItem.deleteMany({ where: { cartId: cart.id, variantId: s.variantId } });
        else await db.cartItem.updateMany({ where: { cartId: cart.id, variantId: s.variantId }, data: { quantity: s.sellable } });
        adjusted.push(s.sellable <= 0 ? `${s.title} sold out and was removed.` : `${s.title}: only ${s.sellable} available, quantity reduced.`);
      }
      outcome = await reserveCart(cart.id);
      if (!outcome.ok) return fail("Some items are no longer available. Please review your cart.");
    }
    return ok({ adjusted });
  });
}

export async function saveContact(_prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    const cart = await activeCart();
    if (!cart) return fail("Your cart is empty.");
    const parsed = contactSchema.safeParse({ email: formData.get("email"), phone: formData.get("phone") ?? "", acceptsMarketing: formData.get("acceptsMarketing") === "on" });
    if (!parsed.success) return failFromZod(parsed.error);
    await saveData(cart.id, (d) => {
      const next = { ...d, contact: parsed.data };
      return { ...next, step: nextIncomplete(next) };
    });
    return ok(null);
  });
}

function readAddress(formData: FormData, prefix: string) {
  const get = (k: string) => formData.get(`${prefix}${k}`) ?? "";
  return addressSchema.safeParse({
    firstName: get("firstName"),
    lastName: get("lastName"),
    company: get("company"),
    line1: get("line1"),
    line2: get("line2"),
    city: get("city"),
    region: get("region"),
    postalCode: get("postalCode"),
    country: get("country"),
  });
}

export async function saveAddress(_prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    const cart = await activeCart();
    if (!cart) return fail("Your cart is empty.");
    const shipping = readAddress(formData, "");
    if (!shipping.success) return failFromZod(shipping.error);
    const sameBilling = formData.get("billingSame") !== "off";
    let billing: CheckoutData["billingAddress"] = null;
    if (!sameBilling) {
      const parsed = readAddress(formData, "billing.");
      if (!parsed.success) return fail("Please fix the highlighted fields.", Object.fromEntries(Object.entries(zodFieldErrors(parsed.error)).map(([k, v]) => [`billing.${k}`, v])));
      billing = parsed.data;
    }
    const rates = await resolveShippingRates(shipping.data.country, cart.items.reduce((n, i) => n + i.quantity * i.variant.price, 0));
    if (rates.length === 0) return fail("Please fix the highlighted fields.", { country: "Sorry, we don't ship to that country yet" });

    // Logged-in customers get the address saved for next time.
    const session = await getCustomerSession();
    if (session && formData.get("saveAddress") === "on") {
      const count = await db.address.count({ where: { customerId: session.customer.id } });
      await db.address.create({ data: { ...shipping.data, customerId: session.customer.id, phone: null, isDefault: count === 0 } });
    }

    await saveData(cart.id, (d) => {
      // A different country means different rates: the old choice is void.
      const countryChanged = d.shippingAddress?.country !== shipping.data.country;
      const next = { ...d, shippingAddress: shipping.data, billingAddress: billing, shippingRateId: countryChanged ? undefined : d.shippingRateId };
      return { ...next, step: nextIncomplete(next) };
    });
    return ok(null);
  });
}

export async function selectShippingRate(_prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    const cart = await activeCart();
    if (!cart) return fail("Your cart is empty.");
    const state = await getCheckoutState();
    const rateId = String(formData.get("shippingRateId") ?? "");
    if (!state.rates.some((r) => r.id === rateId)) return fail("Please fix the highlighted fields.", { shippingRateId: "Choose a delivery option" });
    await saveData(cart.id, (d) => ({ ...d, shippingRateId: rateId, step: "payment" }));
    return ok(null);
  });
}

/** Jump back to an earlier step (the accordion header links). */
export async function goToStep(step: CheckoutStep): Promise<ActionResult<null>> {
  return runAction<null>(async () => {
    const cart = await activeCart();
    if (!cart) return ok(null);
    await saveData(cart.id, (d) => ({ ...d, step }));
    return ok(null);
  });
}

/**
 * Place the order: re-reserve, snapshot, commit inventory, then hand the
 * payment provider its turn. COD needs nothing further, so we finish here.
 */
export async function placeOrder(_prev: ActionResult<null> | null, formData: FormData): Promise<ActionResult<null>> {
  const result = await runAction<{ orderId: string }>(async () => {
    const cart = await activeCart();
    if (!cart || cart.items.length === 0) return fail("Your cart is empty.");
    const state = await getCheckoutState();
    if (!state.data.contact || !state.data.shippingAddress || !state.selectedRate) return fail("Please complete every step before placing the order.");
    const providerId = String(formData.get("provider") ?? "COD");
    if (providerId !== "COD") return fail("Please fix the highlighted fields.", { provider: "Choose a payment method" });
    const note = String(formData.get("note") ?? "").trim().slice(0, 500);

    const held = await reserveCart(cart.id);
    if (!held.ok) return fail("Some items in your cart are no longer available. Please review your cart.");

    const session = await getCustomerSession();
    const customer = session
      ? session.customer
      : await db.customer.upsert({
          where: { email: state.data.contact.email },
          create: { email: state.data.contact.email, firstName: state.data.shippingAddress.firstName, lastName: state.data.shippingAddress.lastName, phone: state.data.contact.phone, acceptsMarketing: state.data.contact.acceptsMarketing },
          update: { phone: state.data.contact.phone, ...(state.data.contact.acceptsMarketing ? { acceptsMarketing: true } : {}) },
          select: { id: true, email: true, firstName: true, lastName: true },
        });

    const shippingAddress = { ...state.data.shippingAddress, phone: state.data.contact.phone };
    const billingAddress = state.data.billingAddress ? { ...state.data.billingAddress, phone: state.data.contact.phone } : shippingAddress;

    let created: { id: string; number: number; total: number };
    try {
      created = await createOrderFromCart({
        cartId: cart.id,
        customerId: customer.id,
        email: state.data.contact.email,
        phone: state.data.contact.phone,
        shippingAddress,
        billingAddress,
        shippingMethod: state.selectedRate.name,
        shippingTotal: state.selectedRate.price,
        taxBps: state.taxBps,
        discount: null,
        provider: "COD",
        note,
      });
    } catch (error) {
      if (error instanceof OrderError) return fail(error.message);
      throw error;
    }

    const provider = getPaymentProvider("COD");
    await provider.initiate({ id: created.id, number: created.number, total: created.total, currency: cart.currency, email: state.data.contact.email });

    // Guest access to the confirmation page, and a fresh cart next visit.
    const store = await cookies();
    store.set(LAST_ORDER_COOKIE, created.id, { httpOnly: true, sameSite: "lax", secure: env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 });
    await clearCartCookie();
    return ok({ orderId: created.id });
  });
  if (result.ok) redirect(`/checkout/${result.data.orderId}/confirmation`);
  return result;
}

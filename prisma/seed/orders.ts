// Seeds 200 orders across the last 90 days. Filled in by item 28.

import { db } from "../../src/lib/db";
import type { FinancialStatus, FulfillmentStatus, OrderStatus, PaymentProvider } from "../../src/generated/prisma/enums";
import { daysAgo, int, pick, rng, shuffle } from "./util";

/**
 * Status mix chosen to look like a real 90-day window: most orders are
 * done, a recent tail is still in flight, and a few went wrong.
 */
type Outcome = "completed" | "fulfilled" | "paid" | "pending" | "cancelled" | "refunded";

function outcomeFor(random: () => number, ageDays: number): Outcome {
  const r = random();
  if (ageDays <= 2) return r < 0.5 ? "pending" : "paid";
  if (ageDays <= 7) return r < 0.15 ? "pending" : r < 0.55 ? "paid" : "fulfilled";
  if (r < 0.06) return "cancelled";
  if (r < 0.11) return "refunded";
  if (r < 0.2) return "fulfilled";
  return "completed";
}

const STATUS: Record<Outcome, { status: OrderStatus; financial: FinancialStatus; fulfillment: FulfillmentStatus }> = {
  pending: { status: "PENDING", financial: "UNPAID", fulfillment: "UNFULFILLED" },
  paid: { status: "PAID", financial: "PAID", fulfillment: "UNFULFILLED" },
  fulfilled: { status: "FULFILLED", financial: "PAID", fulfillment: "FULFILLED" },
  completed: { status: "COMPLETED", financial: "PAID", fulfillment: "FULFILLED" },
  cancelled: { status: "CANCELLED", financial: "VOIDED", fulfillment: "UNFULFILLED" },
  refunded: { status: "REFUNDED", financial: "REFUNDED", fulfillment: "FULFILLED" },
};

const CARRIERS = ["Pathao Courier", "RedX", "Steadfast", "Sundarban Courier"];

type Variant = {
  id: string;
  title: string;
  sku: string | null;
  price: number;
  product: { id: string; title: string; options: { name: string }[] };
  optionValues: { optionValue: { value: string; option: { name: string } } }[];
};

type Address = {
  firstName: string;
  lastName: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
};

function addressJson(a: Address) {
  return {
    firstName: a.firstName,
    lastName: a.lastName,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    region: a.region,
    postalCode: a.postalCode,
    country: a.country,
    phone: a.phone,
  };
}

export async function seedOrders(): Promise<void> {
  const random = rng(28);

  const customers = await db.customer.findMany({
    include: { addresses: { where: { isDefault: true } } },
  });
  const variants: Variant[] = await db.variant.findMany({
    where: { product: { status: "ACTIVE" } },
    include: {
      product: { select: { id: true, title: true, options: { select: { name: true } } } },
      optionValues: { include: { optionValue: { include: { option: true } } } },
    },
  });
  const zones = await db.shippingZone.findMany({ include: { rates: { orderBy: { position: "asc" } } } });
  const taxRates = await db.taxRate.findMany();
  const discounts = await db.discount.findMany({ where: { active: true } });

  if (customers.length === 0 || variants.length === 0) {
    throw new Error("seed: orders need customers and variants first");
  }
  if (zones.length === 0) {
    throw new Error("seed: orders need shipping zones (settings seed) first");
  }

  const firstImageByProduct = new Map<string, string>();
  const media = await db.media.findMany({ where: { ownerType: "PRODUCT", position: 0 } });
  for (const m of media) firstImageByProduct.set(m.ownerId, m.url);

  // Spread 200 orders over 90 days, denser in the recent weeks.
  const ages = Array.from({ length: 200 }, () => Math.floor(Math.pow(random(), 1.4) * 90));

  for (const [i, ageDays] of ages.entries()) {
    const placedAt = daysAgo(ageDays, int(random, 9, 22));
    placedAt.setMinutes(int(random, 0, 59));
    const outcome = outcomeFor(random, ageDays);
    const statuses = STATUS[outcome];

    // 15% guest checkouts: no customer row, address invented from a random customer.
    const isGuest = random() < 0.15;
    const customer = pick(random, customers);
    const address = customer.addresses[0];
    if (!address) throw new Error("seed: customer without default address");
    const email = isGuest ? `guest${i}.${customer.email}` : customer.email;

    // 1–4 distinct variants, 1–3 units each.
    const lineVariants = shuffle(random, variants).slice(0, int(random, 1, 4));
    const items = lineVariants.map((v) => {
      const quantity = random() < 0.75 ? 1 : int(random, 2, 3);
      const options: Record<string, string> = {};
      for (const ov of v.optionValues) options[ov.optionValue.option.name] = ov.optionValue.value;
      return {
        variantId: v.id,
        productId: v.product.id,
        title: v.product.title,
        variantTitle: v.title,
        sku: v.sku,
        options,
        imageUrl: firstImageByProduct.get(v.product.id) ?? null,
        unitPrice: v.price,
        quantity,
        lineTotal: v.price * quantity,
      };
    });
    const subtotal = items.reduce((s, it) => s + it.lineTotal, 0);

    // Discount on ~20% of orders.
    let discountTotal = 0;
    let discountCode: string | null = null;
    const discount = random() < 0.2 && discounts.length > 0 ? pick(random, discounts) : null;
    if (discount && (!discount.minOrderSubtotal || subtotal >= discount.minOrderSubtotal)) {
      discountCode = discount.code;
      if (discount.type === "PERCENTAGE") discountTotal = Math.round((subtotal * discount.value) / 10000);
      else if (discount.type === "FIXED_AMOUNT") discountTotal = Math.min(discount.value, subtotal);
    }

    // Shipping: zone by country, rate by subtotal bounds (free over threshold).
    const zone = zones.find((z) => z.countries.includes(address.country)) ?? zones[0];
    if (!zone) throw new Error("seed: no shipping zone");
    const afterDiscount = subtotal - discountTotal;
    const eligible = zone.rates.filter(
      (r) =>
        (r.minOrderSubtotal === null || afterDiscount >= r.minOrderSubtotal) &&
        (r.maxOrderSubtotal === null || afterDiscount <= r.maxOrderSubtotal),
    );
    const isDhaka = address.city === "Dhaka";
    const rate =
      eligible.find((r) => (isDhaka ? /dhaka/i.test(r.name) && !/outside/i.test(r.name) : /outside/i.test(r.name))) ??
      eligible[0] ??
      zone.rates[0];
    if (!rate) throw new Error("seed: zone has no rates");
    const shippingTotal = discount?.type === "FREE_SHIPPING" ? 0 : rate.price;
    if (discount?.type === "FREE_SHIPPING") discountTotal = 0;

    const tax = taxRates.find((t) => t.country === address.country && t.region === address.region)
      ?? taxRates.find((t) => t.country === address.country && t.region === null);
    const taxTotal = tax ? Math.round((afterDiscount * tax.rateBps) / 10000) : 0;
    const total = afterDiscount + shippingTotal + taxTotal;

    const provider: PaymentProvider = pick(random, ["COD", "COD", "SSLCOMMERZ", "SSLCOMMERZ", "STRIPE"]);
    const paidAt = outcome === "pending" || outcome === "cancelled" ? null : new Date(placedAt.getTime() + int(random, 1, 40) * 60_000);

    const order = await db.order.create({
      data: {
        customerId: isGuest ? null : customer.id,
        email,
        customerName: `${address.firstName} ${address.lastName}`,
        phone: address.phone,
        shippingAddress: addressJson(address),
        billingAddress: addressJson(address),
        currency: "BDT",
        subtotal,
        discountTotal,
        shippingTotal,
        taxTotal,
        total,
        shippingMethod: rate.name,
        discountCode,
        status: statuses.status,
        financialStatus: statuses.financial,
        fulfillmentStatus: statuses.fulfillment,
        note: random() < 0.1 ? "Please call before delivery." : "",
        placedAt,
        paidAt,
        cancelledAt: outcome === "cancelled" ? new Date(placedAt.getTime() + int(random, 30, 600) * 60_000) : null,
        createdAt: placedAt,
        items: { create: items },
      },
    });

    if (discount && discountCode) {
      await db.discountRedemption.create({
        data: { discountId: discount.id, orderId: order.id, customerId: isGuest ? null : customer.id, amount: discountTotal, createdAt: placedAt },
      });
    }

    // Payment row for everything except pending online payments that never came back.
    const paymentStatus = outcome === "pending" ? "PENDING" : outcome === "cancelled" ? "CANCELLED" : outcome === "refunded" ? "REFUNDED" : "CAPTURED";
    const payment = await db.payment.create({
      data: {
        orderId: order.id,
        provider,
        providerTxnId: provider === "COD" ? null : `${provider.toLowerCase()}_${order.number}_${int(random, 100000, 999999)}`,
        amount: total,
        currency: "BDT",
        status: paymentStatus,
        createdAt: placedAt,
        updatedAt: paidAt ?? placedAt,
      },
    });

    if (statuses.fulfillment === "FULFILLED") {
      const shippedAt = new Date((paidAt ?? placedAt).getTime() + int(random, 6, 48) * 3_600_000);
      await db.fulfillment.create({
        data: {
          orderId: order.id,
          items: items.map((it, idx) => ({ orderItemIndex: idx, quantity: it.quantity })),
          carrier: pick(random, CARRIERS),
          trackingNumber: `${pick(random, ["PX", "RX", "SF", "SB"])}${int(random, 10000000, 99999999)}`,
          shippedAt,
          deliveredAt: outcome === "completed" || outcome === "refunded" ? new Date(shippedAt.getTime() + int(random, 12, 72) * 3_600_000) : null,
          createdAt: shippedAt,
        },
      });
    }

    if (outcome === "refunded") {
      const partial = random() < 0.4;
      await db.refund.create({
        data: {
          orderId: order.id,
          paymentId: payment.id,
          providerTxnId: provider === "COD" ? null : `re_${order.number}_${int(random, 100000, 999999)}`,
          amount: partial ? Math.round(total / 2) : total,
          currency: "BDT",
          reason: pick(random, ["Damaged in transit", "Customer changed mind", "Wrong variant shipped"]),
          status: "SUCCEEDED",
          createdAt: new Date(placedAt.getTime() + int(random, 3, 10) * 86_400_000),
        },
      });
      if (partial) {
        await db.order.update({ where: { id: order.id }, data: { financialStatus: "PARTIALLY_REFUNDED" } });
      }
    }
  }
}

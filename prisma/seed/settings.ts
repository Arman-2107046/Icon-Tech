// Seeds site settings, menus, pages, shipping zones, tax rates, discounts.
// Filled in by item 29.

import { db } from "../../src/lib/db";
import { bdt, daysAgo } from "./util";

/** Shape of SiteSettings.data. Validated by the content module's Zod schema. */
const SITE_SETTINGS = {
  store: {
    name: "Icon Tech",
    tagline: "Well-made things for the desk, the bag, and the pocket.",
    email: "hello@icontech.com.bd",
    phone: "+880 1700 000000",
    address: "House 12, Road 5, Gulshan 1, Dhaka 1212",
  },
  social: {
    instagram: "https://instagram.com/icontech.bd",
    facebook: "https://facebook.com/icontech.bd",
    youtube: "https://youtube.com/@icontech",
  },
  homepage: {
    sections: [
      { type: "hero", enabled: true, collection: "new-arrivals" },
      { type: "featured-collection", enabled: true, collection: "desk-setup-essentials", limit: 8 },
      { type: "editorial", enabled: true, collection: "audio" },
      { type: "featured-collection", enabled: true, collection: "gifts-under-5000", limit: 4 },
      { type: "testimonials", enabled: true },
      { type: "logo-row", enabled: true },
      { type: "newsletter", enabled: true },
    ],
  },
  checkout: {
    freeShippingThreshold: bdt(5000),
    codEnabled: true,
  },
};

const MENUS = [
  {
    handle: "main",
    title: "Main navigation",
    items: [
      {
        label: "Shop",
        url: "/collections/new-arrivals",
        children: [
          { label: "New Arrivals", url: "/collections/new-arrivals" },
          { label: "Audio", url: "/collections/audio" },
          { label: "Desk Setup", url: "/collections/desk-setup-essentials" },
          { label: "Gifts Under ৳5,000", url: "/collections/gifts-under-5000" },
          { label: "Sale", url: "/collections/sale" },
        ],
      },
      { label: "About", url: "/pages/about" },
      { label: "Shipping", url: "/pages/shipping-and-returns" },
    ],
  },
  {
    handle: "footer",
    title: "Footer",
    items: [
      { label: "About Icon Tech", url: "/pages/about" },
      { label: "Shipping & Returns", url: "/pages/shipping-and-returns" },
      { label: "Privacy Policy", url: "/pages/privacy-policy" },
      { label: "Contact", url: "mailto:hello@icontech.com.bd" },
    ],
  },
];

const PAGES = [
  {
    handle: "about",
    title: "About Icon Tech",
    body: `## Fewer things, made properly

Icon Tech started in 2021 in a two-room flat in Dhanmondi with one conviction: the accessories around a laptop should be built to the same standard as the laptop.

We stock a short list of brands we use ourselves and would recommend to a friend. Every product is tested in our own office before it goes on the shelf, and anything that doesn't hold up after three months of daily use is dropped from the range.

## Where to find us

Our showroom is at House 12, Road 5, Gulshan 1, open Saturday to Thursday, 11am to 8pm. Bring your laptop and try things before you buy.`,
  },
  {
    handle: "shipping-and-returns",
    title: "Shipping & Returns",
    body: `## Delivery

- **Inside Dhaka**: ৳60, delivered next working day.
- **Outside Dhaka**: ৳120, delivered in 2–4 working days.
- **Orders over ৳5,000** ship free anywhere in Bangladesh.

Orders placed before 3pm are dispatched the same day. You will receive a tracking number by email as soon as the courier collects your parcel.

## Returns

Return anything within 14 days of delivery for a full refund, provided it is unused and in its original packaging. Faulty items are covered for 12 months; contact us and we will arrange collection.

## Cash on delivery

Cash on delivery is available on all orders inside Bangladesh. Please have the exact amount ready for the courier.`,
  },
  {
    handle: "privacy-policy",
    title: "Privacy Policy",
    body: `## What we collect

We collect the details you give us to complete an order: your name, delivery address, phone number, and email. Payment details are handled by our payment providers and never stored on our servers.

## How we use it

To deliver your order, send you order updates, and, if you opt in, occasional emails about new products. You can unsubscribe from marketing emails at any time using the link in the footer of every email.

## Your rights

Email hello@icontech.com.bd to request a copy of the data we hold about you or to have it deleted.`,
  },
];

const SHIPPING_ZONES = [
  {
    name: "Bangladesh",
    countries: ["BD"],
    rates: [
      { name: "Inside Dhaka", price: bdt(60), minOrderSubtotal: null, maxOrderSubtotal: bdt(4999.99) },
      { name: "Outside Dhaka", price: bdt(120), minOrderSubtotal: null, maxOrderSubtotal: bdt(4999.99) },
      { name: "Free shipping", price: 0, minOrderSubtotal: bdt(5000), maxOrderSubtotal: null },
    ],
  },
  {
    name: "International",
    countries: ["IN", "NP", "LK", "MY", "SG", "AE", "GB", "US"],
    rates: [{ name: "International courier", price: bdt(2500), minOrderSubtotal: null, maxOrderSubtotal: null }],
  },
];

/** Bangladesh charges 5% VAT on online retail sales. */
const TAX_RATES = [{ name: "VAT", country: "BD", region: null, rateBps: 500 }];

const DISCOUNTS = [
  {
    code: "WELCOME10",
    title: "10% off your first order",
    type: "PERCENTAGE" as const,
    value: 1000,
    minOrderSubtotal: null,
    usageLimit: null,
    usageLimitPerUser: 1,
    stackable: false,
    startsAt: daysAgo(120),
    endsAt: null,
  },
  {
    code: "FLAT500",
    title: "৳500 off orders over ৳3,000",
    type: "FIXED_AMOUNT" as const,
    value: bdt(500),
    minOrderSubtotal: bdt(3000),
    usageLimit: 500,
    usageLimitPerUser: null,
    stackable: false,
    startsAt: daysAgo(60),
    endsAt: null,
  },
  {
    code: "FREESHIP",
    title: "Free shipping",
    type: "FREE_SHIPPING" as const,
    value: 0,
    minOrderSubtotal: bdt(1500),
    usageLimit: null,
    usageLimitPerUser: null,
    stackable: true,
    startsAt: daysAgo(90),
    endsAt: null,
  },
];

export async function seedSettings(): Promise<void> {
  await db.siteSettings.upsert({
    where: { id: "default" },
    create: { id: "default", data: SITE_SETTINGS },
    update: { data: SITE_SETTINGS },
  });

  for (const menu of MENUS) {
    const created = await db.menu.create({ data: { handle: menu.handle, title: menu.title } });
    for (const [position, item] of menu.items.entries()) {
      const parent = await db.menuItem.create({
        data: { menuId: created.id, label: item.label, url: item.url, position },
      });
      for (const [childPosition, child] of (item.children ?? []).entries()) {
        await db.menuItem.create({
          data: { menuId: created.id, parentId: parent.id, label: child.label, url: child.url, position: childPosition },
        });
      }
    }
  }

  for (const page of PAGES) {
    await db.page.create({
      data: {
        handle: page.handle,
        title: page.title,
        body: page.body,
        seoTitle: `${page.title} | Icon Tech`,
        publishedAt: daysAgo(200),
      },
    });
  }

  for (const [position, zone] of SHIPPING_ZONES.entries()) {
    await db.shippingZone.create({
      data: {
        name: zone.name,
        countries: zone.countries,
        position,
        rates: { create: zone.rates.map((rate, i) => ({ ...rate, position: i })) },
      },
    });
  }

  await db.taxRate.createMany({ data: TAX_RATES });
  await db.discount.createMany({ data: DISCOUNTS });
}

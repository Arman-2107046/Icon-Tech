import "dotenv/config";
import { db } from "../src/lib/db";
import { seedAdmin } from "./seed/admin";
import { seedCatalog } from "./seed/catalog";
import { seedCollections } from "./seed/collections";
import { seedCustomers } from "./seed/customers";
import { seedOrders } from "./seed/orders";
import { seedSettings } from "./seed/settings";

/**
 * Demo-store seeder. Run with `npm run db:seed`, or `npm run db:seed -- --reset`
 * to wipe every table first. Each step is a module in prisma/seed/ so later
 * items (25–29) fill them in without touching this runner.
 *
 * Rule: real-looking data only. No lorem ipsum, no "Product 1".
 */

const RESET = process.argv.includes("--reset");

/** Delete everything, children first, so FKs never block. */
async function reset(): Promise<void> {
  const tables = [
    "email_jobs",
    "webhook_events",
    "magic_link_tokens",
    "sessions",
    "admin_users",
    "discount_redemptions",
    "discounts",
    "fulfillments",
    "refunds",
    "payments",
    "order_items",
    "orders",
    "inventory_reservations",
    "cart_items",
    "carts",
    "inventory_items",
    "variant_option_values",
    "variants",
    "product_option_values",
    "product_options",
    "collection_products",
    "collections",
    "media",
    "products",
    "addresses",
    "customers",
    "shipping_rates",
    "shipping_zones",
    "tax_rates",
    "menu_items",
    "menus",
    "pages",
    "redirects",
    "site_settings",
  ];
  const list = tables.map((t) => `"${t}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  console.log(`reset: truncated ${tables.length} tables`);
}

type Step = { name: string; run: () => Promise<void> };

async function main(): Promise<void> {
  const started = Date.now();
  console.log(`seed: ${RESET ? "resetting and " : ""}seeding demo store`);

  if (RESET) {
    await reset();
  } else if ((await db.product.count()) > 0) {
    console.error("seed: database already has data. Re-run with --reset to wipe and reseed.");
    process.exitCode = 1;
    return;
  }

  const steps: Step[] = [
    { name: "admin user", run: seedAdmin },
    { name: "settings, menus, pages, shipping, tax, discounts", run: seedSettings },
    { name: "products", run: seedCatalog },
    { name: "collections", run: seedCollections },
    { name: "customers", run: seedCustomers },
    { name: "orders", run: seedOrders },
  ];

  for (const step of steps) {
    const t = Date.now();
    await step.run();
    console.log(`  ✓ ${step.name} (${Date.now() - t}ms)`);
  }

  console.log(`seed: done in ${Date.now() - started}ms`);
}

main()
  .catch((error: unknown) => {
    console.error("seed: failed", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

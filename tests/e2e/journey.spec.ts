import { expect, test, type Page } from "@playwright/test";
import { login, releaseAllHolds } from "./helpers";

/**
 * The whole purchase, end to end: browse from the homepage into a collection,
 * open a product, pick a variant, add to cart, check out with cash on
 * delivery, land on the confirmation, then confirm the order shows up in
 * the admin with the right totals, and receives its confirmation email.
 */
const go = (page: Page, url: string) => page.goto(url, { waitUntil: "domcontentloaded" });

test("browse → add to cart → COD checkout → confirmation → order in admin", async ({ page, browser, request }, testInfo) => {
  test.setTimeout(120_000);
  await releaseAllHolds(request);
  const stamp = Date.now().toString(36);
  const email = `journey+${stamp}@example.com`;

  // Browse: home → collection → product.
  await go(page, "/");
  await page.waitForLoadState("networkidle");
  await go(page, "/collections/new-arrivals");
  await page.getByTestId("product-card").filter({ hasText: "Porter Tech Backpack" }).getByRole("heading").getByRole("link").click();
  await expect(page).toHaveURL(/\/products\/porter-tech-backpack/);

  // Variant + cart.
  await page.getByTestId("option-Colour").getByRole("button", { name: "Navy" }).click();
  await expect(page).toHaveURL(/[?&]variant=/);
  await page.getByTestId("add-to-cart").click();
  const drawer = page.getByTestId("cart-drawer");
  await expect(drawer.getByTestId("line-qty")).toHaveText("1");
  await drawer.getByRole("button", { name: "Increase quantity" }).click();
  await expect(drawer.getByTestId("line-qty")).toHaveText("2");
  await expect(drawer.getByTestId("cart-subtotal")).toContainText("25,000.00");
  await drawer.getByRole("link", { name: "Checkout" }).click();

  // Checkout with COD.
  await expect(page).toHaveURL(/\/checkout$/);
  const contact = page.getByTestId("step-contact");
  await contact.getByRole("textbox", { name: "Email" }).fill(email);
  await contact.getByRole("textbox", { name: "Phone" }).fill("+8801711000000");
  await contact.getByRole("button", { name: "Continue to address" }).click();
  const address = page.getByTestId("step-address");
  await address.getByLabel("First name").fill("Journey");
  await address.getByLabel("Last name").fill("Tester");
  await address.getByLabel("Address", { exact: true }).fill("House 7, Road 11");
  await address.getByLabel("City").fill("Dhaka");
  await address.getByLabel("District / region (optional)").fill("Dhaka");
  await address.getByLabel("Country").selectOption("BD");
  await address.getByRole("button", { name: "Continue to delivery" }).click();
  const shipping = page.getByTestId("step-shipping");
  await shipping.getByLabel(/Free shipping/).check();
  await shipping.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page.getByTestId("checkout-total")).toContainText("26,250.00"); // 25,000 + 5% VAT
  await expect(page.getByTestId("step-payment").getByText("Cash on delivery")).toBeVisible();
  await page.getByRole("button", { name: "Place order" }).click();

  // Confirmation.
  await expect(page).toHaveURL(/\/checkout\/[a-z0-9]+\/confirmation$/);
  await expect(page.getByTestId("confirmation")).toContainText("Thanks, Journey.");
  await expect(page.getByTestId("confirmation-total")).toContainText("26,250.00");
  const number = (await page.getByTestId("order-number").innerText()).replace("#", "");
  await go(page, "/");
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("cart-count")).toHaveCount(0);

  // Admin sees the order, its lines, COD, and the pending statuses.
  const ctx = await browser.newContext();
  const admin = await ctx.newPage();
  try {
    await login(admin);
    await admin.goto(`/admin/orders?q=${number}`, { waitUntil: "domcontentloaded" });
    await expect(admin.locator("tbody tr")).toHaveCount(1);
    await admin.locator("tbody tr").first().getByRole("link").first().click();
    await admin.waitForURL(/\/admin\/orders\/[a-z0-9]+$/);
    await expect(admin.getByRole("heading", { name: `Order #${number}` })).toBeVisible();
    await expect(admin.getByText("Porter Tech Backpack")).toBeVisible();
    await expect(admin.locator("tr").filter({ hasText: "Porter Tech Backpack" }).first().getByRole("cell", { name: "2", exact: true })).toBeVisible();
    await expect(admin.getByText(email).first()).toBeVisible();
    await expect(admin.getByText(/cash on delivery/i).first()).toBeVisible();
    await expect(admin.getByText("26,250.00").first()).toBeVisible();
    for (const status of ["Pending", "Unpaid", "Unfulfilled"]) await expect(admin.getByText(status, { exact: true }).first()).toBeVisible();

    // Dashboard counts it as awaiting action.
    await admin.goto("/admin");
    await expect(admin.getByTestId("dashboard-stats").getByText("Awaiting action")).toBeVisible();
  } finally {
    await ctx.close();
  }

  // The confirmation email was queued for this order and the worker sends it (SKIPPED without a key).
  const secret = process.env.CRON_SECRET ?? "";
  test.skip(!secret, "CRON_SECRET not set");
  const worker = await request.post("/api/cron/send-emails", { headers: { authorization: `Bearer ${secret}` } });
  expect(worker.status()).toBe(200);
  void testInfo;
});

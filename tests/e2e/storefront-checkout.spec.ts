import { expect, test } from "@playwright/test";
import { releaseAllHolds } from "./helpers";

const go = (page: import("@playwright/test").Page, url: string) => page.goto(url, { waitUntil: "domcontentloaded" });

test.describe("checkout", () => {
  test("cash-on-delivery checkout from cart to confirmation", async ({ page, request }) => {
    const stamp = Date.now().toString(36);
    await releaseAllHolds(request);

    // One backpack (Navy has plenty of stock; each run consumes one unit).
    await go(page, "/products/porter-tech-backpack");
    await page.waitForLoadState("networkidle");
    await page.getByTestId("option-Colour").getByRole("button", { name: "Navy" }).click();
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("cart-drawer")).toBeVisible();
    await expect(page.getByTestId("cart-drawer").getByTestId("line-qty")).toHaveText("1");
    await page.getByTestId("cart-drawer").getByRole("link", { name: "Checkout" }).click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
    await expect(page.getByTestId("checkout-total")).toContainText("12,500.00"); // no shipping yet

    // No storefront nav in checkout.
    await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
    await expect(page.getByText("Secure checkout")).toBeVisible();

    // Contact: validation, then save.
    const contact = page.getByTestId("step-contact");
    await contact.getByRole("textbox", { name: "Email" }).fill("not-an-email");
    await contact.getByRole("textbox", { name: "Phone" }).fill("12");
    await contact.getByRole("button", { name: "Continue to address" }).click();
    await expect(contact.getByText("Enter a valid email address")).toBeVisible();
    await expect(contact.getByText(/valid phone number|courier can call/)).toBeVisible();
    await contact.getByRole("textbox", { name: "Email" }).fill(`checkout+${stamp}@example.com`);
    await contact.getByRole("textbox", { name: "Phone" }).fill("+8801711000000");
    await contact.getByRole("button", { name: "Continue to address" }).click();
    await expect(page.getByTestId("step-address")).toHaveAttribute("data-open", "true");
    await expect(page.getByTestId("step-contact")).toContainText(`checkout+${stamp}@example.com`);

    // Address: required fields, then save (Dhaka → tax 5%).
    const address = page.getByTestId("step-address");
    await address.getByRole("button", { name: "Continue to delivery" }).click();
    await expect(address.getByText("First name is required")).toBeVisible();
    await address.getByLabel("First name").fill("Ayesha");
    await address.getByLabel("Last name").fill("Rahman");
    await address.getByLabel("Address", { exact: true }).fill("House 12, Road 5");
    await address.getByLabel("City").fill("Dhaka");
    await address.getByLabel("District / region (optional)").fill("Dhaka");
    await address.getByLabel("Country").selectOption("BD");
    await address.getByRole("button", { name: "Continue to delivery" }).click();
    await expect(page.getByTestId("step-shipping")).toHaveAttribute("data-open", "true");

    // Shipping: subtotal ৳12,500 qualifies for "Free shipping" → total = 12500 + 5% VAT (625) = 13,125.
    const shipping = page.getByTestId("step-shipping");
    await expect(shipping.getByText("Free shipping")).toBeVisible();
    await expect(shipping.getByText("Inside Dhaka")).toHaveCount(0); // paid rates only apply under ৳5,000
    await shipping.getByLabel(/Free shipping/).check();
    await shipping.getByRole("button", { name: "Continue to payment" }).click();
    await expect(page.getByTestId("step-payment")).toHaveAttribute("data-open", "true");
    await expect(page.getByTestId("checkout-total")).toContainText("13,125.00");

    // Edit an earlier step: saving jumps back to the first incomplete step (payment).
    await page.getByTestId("step-contact").getByRole("button", { name: "Edit" }).click();
    await expect(page.getByTestId("step-contact")).toHaveAttribute("data-open", "true");
    await page.getByTestId("step-contact").getByRole("button", { name: "Continue to address" }).click();
    await expect(page.getByTestId("step-payment")).toHaveAttribute("data-open", "true");
    await expect(page.getByTestId("step-address")).toContainText("House 12, Road 5");

    // Place the order.
    await page.getByTestId("step-payment").getByLabel(/Delivery note/).fill("Ring the bell twice.");
    await page.getByRole("button", { name: "Place order" }).click();
    await expect(page).toHaveURL(/\/checkout\/[a-z0-9]+\/confirmation$/);
    await expect(page.getByTestId("confirmation")).toContainText("Thanks, Ayesha.");
    await expect(page.getByTestId("confirmation-total")).toContainText("13,125.00");
    const number = await page.getByTestId("order-number").innerText();
    expect(number).toMatch(/^#\d+$/);

    // Cart is empty afterwards; the confirmation is private to this browser.
    const confirmationUrl = page.url();
    await go(page, "/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("cart-count")).toHaveCount(0);
    // (The 404 streams inside Suspense, so assert on the body, not the status.)
    const anon = await (await request.get(confirmationUrl.replace(/^https?:\/\/[^/]+/, ""))).text();
    expect(anon).not.toContain("Thanks, Ayesha");
    expect(anon).toMatch(/404|not (be )?found/i);
  });

  test("cron route releases expired reservations and rejects bad secrets", async ({ request }) => {
    const unauth = await request.post("/api/cron/release-reservations");
    expect(unauth.status()).toBe(401);
    const bad = await request.post("/api/cron/release-reservations", { headers: { authorization: "Bearer nope" } });
    expect(bad.status()).toBe(401);
    const secret = process.env.CRON_SECRET ?? "";
    test.skip(!secret, "CRON_SECRET not set in this environment");
    const ok = await request.post("/api/cron/release-reservations", { headers: { authorization: `Bearer ${secret}` } });
    expect(ok.status()).toBe(200);
    expect(await ok.json()).toMatchObject({ ok: true, olderThanMinutes: 30 });
  });
});

test("placing an order queues a confirmation email that the worker processes", async ({ page, request }) => {
  await releaseAllHolds(request);
  const email = `mail+${Date.now().toString(36)}@example.com`;
  await go(page, "/products/porter-tech-backpack");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("option-Colour").getByRole("button", { name: "Navy" }).click();
  await page.getByTestId("add-to-cart").click();
  await page.getByTestId("cart-drawer").getByRole("link", { name: "Checkout" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  const contact = page.getByTestId("step-contact");
  await contact.getByRole("textbox", { name: "Email" }).fill(email);
  await contact.getByRole("textbox", { name: "Phone" }).fill("+8801711000000");
  await contact.getByRole("button", { name: "Continue to address" }).click();
  const address = page.getByTestId("step-address");
  await address.getByLabel("First name").fill("Nusrat");
  await address.getByLabel("Last name").fill("Jahan");
  await address.getByLabel("Address", { exact: true }).fill("Flat 3, House 9, Road 2");
  await address.getByLabel("City").fill("Dhaka");
  await address.getByRole("button", { name: "Continue to delivery" }).click();
  await page.getByTestId("step-shipping").getByRole("button", { name: "Continue to payment" }).click();
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/confirmation$/);

  // Worker drains the outbox. Locally there is no Resend key, so the job is
  // SKIPPED with a reason rather than silently "sent".
  const secret = process.env.CRON_SECRET ?? "";
  test.skip(!secret, "CRON_SECRET not set");
  const res = await request.post("/api/cron/send-emails", { headers: { authorization: `Bearer ${secret}` } });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { ok: boolean; sent: number; skipped: number; failed: number };
  expect(body.ok).toBe(true);
  expect(body.failed).toBe(0);
  expect(body.sent + body.skipped).toBeGreaterThan(0);
});

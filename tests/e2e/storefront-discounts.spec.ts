import { expect, test, type Browser, type Page } from "@playwright/test";
import { login, releaseAllHolds } from "./helpers";

/**
 * Discount codes at checkout: stacking, exclusivity, invalid codes, and the
 * redemption recorded on the order. Codes are created (and removed) through
 * the admin in a separate browser context.
 */
const go = (page: Page, url: string) => page.goto(url, { waitUntil: "domcontentloaded" });

async function createCode(admin: Page, code: string, type: string, value: string, stackable: boolean) {
  await admin.goto("/admin/discounts");
  await admin.getByRole("button", { name: "Add discount" }).click();
  const dialog = admin.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Code" }).fill(code);
  await dialog.getByRole("textbox", { name: "Title" }).fill(`E2E ${code}`);
  await dialog.getByRole("combobox", { name: "Type" }).click();
  await admin.getByRole("option", { name: type }).click();
  if (value) await dialog.getByRole("textbox", { name: "Value" }).fill(value);
  if (stackable) await dialog.getByRole("checkbox", { name: /Can be combined/ }).check();
  await dialog.getByRole("button", { name: "Create discount" }).click();
  await expect(admin.getByRole("dialog")).toHaveCount(0);
}

async function deleteCode(admin: Page, code: string) {
  await admin.goto("/admin/discounts");
  const row = admin.getByTestId("discount-row").filter({ hasText: code });
  if ((await row.count()) === 0) return;
  await row.getByRole("button", { name: `Delete discount ${code}` }).click();
  await expect(row).toHaveCount(0);
}

async function adminPage(browser: Browser) {
  const ctx = await browser.newContext();
  const admin = await ctx.newPage();
  admin.on("dialog", (d) => d.accept());
  await login(admin);
  return { ctx, admin };
}

test("stackable codes combine, exclusive codes do not, redemption lands on the order", async ({ page, browser, request }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Admin-driven setup; the mobile checkout flow is covered by storefront-checkout.");
  test.setTimeout(120_000);
  const stamp = Date.now().toString(36).slice(-5).toUpperCase();
  const PCT = `E2EPCT${stamp}`;
  const FLAT = `E2EFLAT${stamp}`;
  const EXCL = `E2EEXCL${stamp}`;
  const { ctx, admin } = await adminPage(browser);
  await createCode(admin, PCT, "Percentage off", "10", true);
  await createCode(admin, FLAT, "Fixed amount off", "500", true);
  await createCode(admin, EXCL, "Free shipping", "", false);

  try {
    await releaseAllHolds(request);
    await go(page, "/products/porter-tech-backpack");
    await page.waitForLoadState("networkidle");
    await page.getByTestId("option-Colour").getByRole("button", { name: "Navy" }).click();
    await page.getByTestId("add-to-cart").click();
    await page.getByTestId("cart-drawer").getByRole("link", { name: "Checkout" }).click();
    await expect(page.getByTestId("checkout-total")).toContainText("12,500.00");

    const codes = page.getByTestId("discount-codes");
    const codeBox = () => codes.getByRole("textbox", { name: "Discount code" });
    await codeBox().fill("NOPE-NOT-A-CODE");
    await codes.getByRole("button", { name: "Apply" }).click();
    await expect(codes.getByText("That code is not valid.")).toBeVisible();

    await codeBox().fill(PCT.toLowerCase());
    await codes.getByRole("button", { name: "Apply" }).click();
    await expect(codes.getByTestId("applied-code")).toHaveCount(1);
    await expect(page.getByTestId("checkout-total")).toContainText("11,250.00"); // 10% of 12,500

    await codes.getByRole("button", { name: "Add another code" }).click();
    await codeBox().fill(EXCL);
    await codes.getByRole("button", { name: "Apply" }).click();
    await expect(codes.getByText("cannot be combined")).toBeVisible();

    await codeBox().fill(FLAT);
    await codes.getByRole("button", { name: "Apply" }).click();
    await expect(codes.getByTestId("applied-code")).toHaveCount(2);
    await expect(page.getByTestId("checkout-total")).toContainText("10,750.00"); // −1,250 −500

    await codes.getByRole("button", { name: "Add another code" }).click();
    await codeBox().fill(PCT);
    await codes.getByRole("button", { name: "Apply" }).click();
    await expect(codes.getByText("already applied")).toBeVisible();

    // Removing a chip recalculates.
    await codes.getByRole("button", { name: `Remove code ${FLAT}` }).click();
    await expect(codes.getByTestId("applied-code")).toHaveCount(1);
    await expect(page.getByTestId("checkout-total")).toContainText("11,250.00");

    // Complete checkout: 11,250 + 5% VAT (562.50) = 11,812.50; free shipping still applies (≥ 5,000).
    const contact = page.getByTestId("step-contact");
    await contact.getByRole("textbox", { name: "Email" }).fill(`discount+${stamp.toLowerCase()}@example.com`);
    await contact.getByRole("textbox", { name: "Phone" }).fill("+8801711000000");
    await contact.getByRole("button", { name: "Continue to address" }).click();
    const address = page.getByTestId("step-address");
    await address.getByLabel("First name").fill("Nadia");
    await address.getByLabel("Last name").fill("Islam");
    await address.getByLabel("Address", { exact: true }).fill("Flat 3B, Banani");
    await address.getByLabel("City").fill("Dhaka");
    await address.getByLabel("District / region (optional)").fill("Dhaka");
    await address.getByLabel("Country").selectOption("BD");
    await address.getByRole("button", { name: "Continue to delivery" }).click();
    const shipping = page.getByTestId("step-shipping");
    await shipping.getByLabel(/Free shipping/).check();
    await shipping.getByRole("button", { name: "Continue to payment" }).click();
    await expect(page.getByTestId("checkout-total")).toContainText("11,812.50");
    await page.getByRole("button", { name: "Place order" }).click();
    await expect(page).toHaveURL(/\/confirmation$/);
    await expect(page.getByTestId("confirmation-total")).toContainText("11,812.50");
    const number = (await page.getByTestId("order-number").innerText()).replace("#", "");

    // Admin sees the code on the order and one redemption counted.
    await admin.goto("/admin/orders");
    await admin.getByRole("link", { name: `#${number}` }).click();
    await expect(admin.getByText(`Discount (${PCT})`)).toBeVisible();
    await admin.goto("/admin/discounts");
    await expect(admin.getByTestId("discount-row").filter({ hasText: PCT }).locator("td").nth(3)).toHaveText("1");
  } finally {
    for (const c of [PCT, FLAT, EXCL]) await deleteCode(admin, c);
    await ctx.close();
  }
});

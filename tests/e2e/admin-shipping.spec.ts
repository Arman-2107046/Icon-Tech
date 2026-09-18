import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("admin@icontech.com.bd");
  await page.getByLabel("Password").fill("admin12345");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/);
}

test("shipping zones and rates: create, validate, edit, delete", async ({ page }) => {
  await login(page);
  await page.goto("/admin/shipping");
  const stamp = Date.now().toString(36).slice(-4).toUpperCase();
  const zoneName = `E2E Zone ${stamp}`;

  // Country already in another zone is rejected on the field.
  await page.getByRole("button", { name: "Add zone" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Zone name" }).fill(zoneName);
  await dialog.getByRole("textbox", { name: "Countries" }).fill("bd, xx1");
  await dialog.getByRole("button", { name: "Create zone" }).click();
  await expect(dialog.getByText("Use two-letter country codes like BD or GB")).toBeVisible();
  await dialog.getByRole("textbox", { name: "Countries" }).fill("bd");
  await dialog.getByRole("button", { name: "Create zone" }).click();
  await expect(dialog.getByText(/BD is already in the "Bangladesh" zone/)).toBeVisible();
  await dialog.getByRole("textbox", { name: "Countries" }).fill("ZA, ke");
  await dialog.getByRole("button", { name: "Create zone" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const zone = page.getByTestId("shipping-zone").filter({ hasText: zoneName });
  await expect(zone).toBeVisible();
  await expect(zone.getByText("ZA")).toBeVisible();
  await expect(zone.getByText("KE")).toBeVisible();

  // Add a rate; max below min is rejected.
  await zone.getByRole("button", { name: "Add rate" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Rate name" }).fill("Courier");
  await dialog.getByRole("textbox", { name: "Price (BDT)" }).fill("2500");
  await dialog.getByRole("textbox", { name: "Minimum order subtotal (BDT)" }).fill("1000");
  await dialog.getByRole("textbox", { name: "Maximum order subtotal (BDT)" }).fill("500");
  await dialog.getByRole("button", { name: "Create rate" }).click();
  await expect(dialog.getByText("Maximum must be at least the minimum")).toBeVisible();
  await dialog.getByRole("textbox", { name: "Maximum order subtotal (BDT)" }).fill("");
  await dialog.getByRole("button", { name: "Create rate" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(zone.locator("tbody tr")).toHaveCount(1);
  await expect(zone.locator("tbody tr").first()).toContainText("৳2,500.00");
  await expect(zone.locator("tbody tr").first()).toContainText("from ৳1,000.00");

  // Edit the rate to free shipping.
  await zone.getByRole("button", { name: "Edit rate Courier" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Price (BDT)" }).fill("0");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(zone.locator("tbody tr").first()).toContainText("Free");

  // Delete rate, then zone.
  page.on("dialog", (d) => d.accept());
  await zone.getByRole("button", { name: "Delete rate Courier" }).click();
  await expect(zone.getByText("No rates yet")).toBeVisible();
  await zone.getByRole("button", { name: `Delete zone ${zoneName}` }).click();
  await expect(page.getByTestId("shipping-zone").filter({ hasText: zoneName })).toHaveCount(0);
});

test("tax rates: create, reject duplicate country/region, edit, delete", async ({ page }) => {
  await login(page);
  await page.goto("/admin/shipping");
  const card = page.getByTestId("tax-rates");
  await expect(card.locator("tbody tr").filter({ hasText: "BD" }).first()).toContainText("5%");

  // Duplicate of the seeded BD country-wide rate.
  await card.getByRole("button", { name: "Add tax rate" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Name" }).fill("VAT");
  await dialog.getByRole("textbox", { name: "Country" }).fill("bd");
  await dialog.getByRole("textbox", { name: "Rate (%)" }).fill("7.5");
  await dialog.getByRole("button", { name: "Create tax rate" }).click();
  await expect(dialog.getByText("A rate for this country and region already exists")).toBeVisible();

  // Region-specific rate is fine.
  await dialog.getByRole("textbox", { name: "Region" }).fill("E2E Region");
  await dialog.getByRole("button", { name: "Create tax rate" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const row = card.locator("tbody tr").filter({ hasText: "E2E Region" });
  await expect(row).toContainText("7.5%");

  await row.getByRole("button", { name: "Edit tax rate VAT" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Rate (%)" }).fill("10");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row).toContainText("10%");

  page.on("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "Delete tax rate VAT BD E2E Region" }).click();
  await expect(card.locator("tbody tr").filter({ hasText: "E2E Region" })).toHaveCount(0);
});

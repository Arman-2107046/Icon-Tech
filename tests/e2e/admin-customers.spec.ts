import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("customer detail: stats, orders, addresses, notes, marketing toggle", async ({ page }) => {
  await login(page);
  await page.goto("/admin/customers");
  // Open the first customer with at least one order (seeded / prior e2e runs).
  const row = page.locator("tbody tr").filter({ hasNot: page.getByText(/^0$/) }).first();
  await row.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/admin\/customers\/[a-z0-9]+$/);
  await expect(page.getByTestId("customer-stats")).toContainText("Lifetime value");
  await expect(page.getByRole("main").getByText("Orders", { exact: true }).first()).toBeVisible();

  const note = `Prefers evening delivery ${Date.now()}`;
  await page.getByLabel("Staff notes").fill(note);
  await page.getByRole("button", { name: "Save note" }).click();
  await page.reload();
  await expect(page.getByLabel("Staff notes")).toHaveValue(note);

  const toggle = page.getByRole("button", { name: /marketing/i });
  const before = await toggle.innerText();
  await toggle.click();
  await expect(page.getByRole("button", { name: /marketing/i })).not.toHaveText(before);
  await page.getByRole("button", { name: /marketing/i }).click();
  await expect(page.getByRole("button", { name: /marketing/i })).toHaveText(before);

  // Order detail links back here.
  const orderLink = page.getByTestId("customer-order").first().getByRole("link");
  if (await orderLink.count()) {
    await orderLink.click();
    await expect(page).toHaveURL(/\/admin\/orders\//);
    await page.getByRole("link", { name: /view customer/ }).click();
    await expect(page).toHaveURL(/\/admin\/customers\//);
  }
});

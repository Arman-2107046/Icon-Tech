import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";

async function createProduct(page: Page, title: string) {
  await page.goto("/admin/products/new");
  await page.getByRole("textbox", { name: "Title", exact: true }).fill(title);
  await page.getByRole("button", { name: "Create product" }).click();
  await page.waitForURL(/\/admin\/products\/[a-z0-9]+$/);
}

test("option builder generates the matrix and preserves existing variants", async ({ page }) => {
  await login(page);
  await createProduct(page, `E2E Options ${Date.now().toString(36)}`);
  const rows = page.locator("tbody tr");

  // Size: S, M  -> 2 variants
  await page.getByRole("button", { name: "Add option" }).click();
  await page.getByLabel("Option 1 name").fill("Size");
  const sizeValues = page.getByLabel("Values").first();
  await sizeValues.fill("S");
  await sizeValues.press("Enter");
  await sizeValues.fill("M");
  await sizeValues.press("Enter");
  await expect(page.getByTestId("matrix-preview")).toContainText("2 variants");
  await page.getByRole("button", { name: "Save options" }).click();
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("S");
  await expect(rows.nth(1)).toContainText("M");

  // Add Colour: Red, Blue -> 4 variants; "S" and "M" alone no longer exist,
  // so all four are new (the plan matches on the full selection).
  await page.getByRole("button", { name: "Add option" }).click();
  await page.getByLabel("Option 2 name").fill("Colour");
  const colourValues = page.getByLabel("Values").nth(1);
  await colourValues.fill("Red");
  await colourValues.press("Enter");
  await colourValues.fill("Blue");
  await colourValues.press(","); // comma also commits a chip
  await expect(page.getByTestId("matrix-preview")).toContainText("4 variants · 0 kept, 4 new, 2 removed");
  await page.getByRole("button", { name: "Save options" }).click();
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(0)).toContainText("S / Red");
  await expect(rows.nth(3)).toContainText("M / Blue");

  // Add a third Size value: the four existing survive, two are created.
  await sizeValues.fill("L");
  await sizeValues.press("Enter");
  await expect(page.getByTestId("matrix-preview")).toContainText("6 variants · 4 kept, 2 new, 0 removed");
  await page.getByRole("button", { name: "Save options" }).click();
  await expect(rows).toHaveCount(6);
  await expect(rows.nth(4)).toContainText("L / Red");

  // Remove Blue via its chip: 3 kept, 3 removed.
  await page.getByRole("button", { name: "Remove Blue" }).click();
  await expect(page.getByTestId("matrix-preview")).toContainText("3 variants · 3 kept, 0 new, 3 removed");
});

test("variant rows save price, compare-at, SKU and stock inline", async ({ page }) => {
  await login(page);
  const stamp = Date.now().toString(36);
  await createProduct(page, `E2E Variants ${stamp}`);
  await page.getByRole("button", { name: "Add option" }).click();
  await page.getByLabel("Option 1 name").fill("Size");
  const values = page.getByLabel("Values").first();
  await values.fill("S");
  await values.press("Enter");
  await values.fill("M");
  await values.press("Enter");
  await page.getByRole("button", { name: "Save options" }).click();
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(2);

  const row = rows.nth(0);
  await row.getByLabel("S SKU").fill(`E2E-${stamp}-S`);
  await row.getByLabel("S price").fill("1299.50");
  await row.getByLabel("S compare-at price").fill("999");
  await row.getByLabel("S stock").fill("12");
  await row.getByRole("button", { name: "Save" }).click();
  await expect(row.getByText("Compare-at must be higher than the price")).toBeVisible();
  await expect(row.getByLabel("S price")).toHaveValue("1299.50"); // preserved

  await row.getByLabel("S compare-at price").fill("1500");
  await row.getByRole("button", { name: "Save" }).click();
  await expect(row.getByLabel("Saved")).toBeVisible();

  // Duplicate SKU on the other row is rejected on the field.
  const row2 = rows.nth(1);
  await row2.getByLabel("M SKU").fill(`E2E-${stamp}-S`);
  await row2.getByRole("button", { name: "Save" }).click();
  await expect(row2.getByText("Another variant already uses this SKU")).toBeVisible();
  await expect(row.getByLabel("Saved")).toBeVisible();

  await page.reload();
  await expect(page.locator("tbody tr").nth(0).getByLabel("S price")).toHaveValue("1299.50");
  await expect(page.locator("tbody tr").nth(0).getByLabel("S stock")).toHaveValue("12");
  await expect(page.locator("tbody tr").nth(0).getByLabel("S SKU")).toHaveValue(`E2E-${stamp}-S`);
});

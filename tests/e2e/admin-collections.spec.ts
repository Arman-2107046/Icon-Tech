import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("admin@icontech.com.bd");
  await page.getByLabel("Password").fill("admin12345");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/);
}

test("manual collection: create, add products, reorder, remove, delete", async ({ page }) => {
  await login(page);
  const stamp = Date.now().toString(36);

  await page.goto("/admin/collections/new");
  await page.getByRole("textbox", { name: "Title", exact: true }).fill(`E2E Picks ${stamp}`);
  await page.getByRole("button", { name: "Create collection" }).click();
  await page.waitForURL(/\/admin\/collections\/[a-z0-9]+$/);
  await expect(page.getByRole("textbox", { name: "Handle" })).toHaveValue(`e2e-picks-${stamp}`);

  const search = page.getByLabel("Search products to add");
  const rows = page.getByTestId("collection-products").locator("li");

  await search.fill("volt gan");
  await page.getByRole("listbox").getByRole("button", { name: /Volt GaN Charger/ }).click();
  await expect(rows).toHaveCount(1);

  await search.fill("aria buds pro");
  await page.getByRole("listbox").getByRole("button", { name: /Aria Buds Pro/ }).click();
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Volt GaN Charger");
  await expect(rows.nth(1)).toContainText("Aria Buds Pro");

  // Already-added products are excluded from search results.
  await search.fill("aria buds pro");
  await expect(page.getByRole("listbox")).toContainText("No products found");
  await search.fill("");

  // Reorder via drag, then verify it persisted.
  await rows.nth(1).dragTo(rows.nth(0));
  await expect(rows.nth(0)).toContainText("Aria Buds Pro");
  await page.reload();
  await expect(page.getByTestId("collection-products").locator("li").nth(0)).toContainText("Aria Buds Pro");

  // Remove one; the list shows it in the admin table count.
  await page.getByRole("button", { name: "Remove Volt GaN Charger" }).click();
  await expect(page.getByTestId("collection-products").locator("li")).toHaveCount(1);
  await page.goto(`/admin/collections?q=e2e-picks-${stamp}`);
  await expect(page.locator("tbody tr").first()).toContainText("1");

  // Delete.
  await page.locator("tbody tr").first().getByRole("link").first().click();
  await page.waitForURL(/\/admin\/collections\/[a-z0-9]+$/);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete" }).click();
  await page.waitForURL(/\/admin\/collections$/);
  await page.goto(`/admin/collections?q=e2e-picks-${stamp}`);
  await expect(page.getByText("No collections match.")).toBeVisible();
});

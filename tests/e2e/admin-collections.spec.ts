import { expect, test } from "@playwright/test";
import { actAndWait, login, submitAndWait } from "./helpers";

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
  await actAndWait(page, () => rows.nth(1).dragTo(rows.nth(0)));
  await expect(rows.nth(0)).toContainText("Aria Buds Pro");
  await expect(page.getByRole("button", { name: "Move Aria Buds Pro down" })).toBeEnabled();
  await page.reload();
  await expect(page.getByTestId("collection-products").locator("li").nth(0)).toContainText("Aria Buds Pro");

  // Remove one; the list shows it in the admin table count.
  await page.getByRole("button", { name: "Remove Volt GaN Charger" }).click();
  await expect(page.getByTestId("collection-products").locator("li")).toHaveCount(1);
  await page.goto(`/admin/collections?q=e2e-picks-${stamp}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("tbody tr").first()).toContainText("1");

  // Delete.
  await page.locator("tbody tr").first().getByRole("link").first().click();
  await page.waitForURL(/\/admin\/collections\/[a-z0-9]+$/);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete" }).click();
  await page.waitForURL(/\/admin\/collections$/);
  await page.goto(`/admin/collections?q=e2e-picks-${stamp}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("No collections match.")).toBeVisible();
});

test("rule collection: preview, edit, save, and products-list filter resolve rules", async ({ page }) => {
  await login(page);
  await page.goto("/admin/collections?q=audio");
  await page.locator("tbody tr").first().getByRole("link").first().click();
  await page.waitForURL(/\/admin\/collections\/[a-z0-9]+$/);

  const preview = page.getByTestId("rules-preview");
  const count = async () => {
    const text = await preview.innerText();
    const m = /^(\d+) matching/.exec(text);
    return m ? Number(m[1]) : NaN;
  };

  // Seeded rule: tag is "audio". Other specs may have added audio-tagged
  // products, so assert relative to the current count. Force "all" in case
  // an earlier run left the collection on "any".
  await page.getByRole("combobox", { name: "Match mode" }).click();
  await page.getByRole("option", { name: "all conditions" }).click();
  await expect(preview).toContainText(/\d+ matching products/);
  await expect(preview).toContainText("Aria Active Noise-Cancelling Headphones");
  const all = await count();
  expect(all).toBeGreaterThanOrEqual(8);

  // Add "vendor is Aria Audio" (all) -> exactly the 4 Aria audio products.
  await page.getByRole("button", { name: "Add condition" }).click();
  await page.getByRole("combobox", { name: "Condition 2 field" }).click();
  await page.getByRole("option", { name: "Vendor" }).click();
  await page.getByRole("textbox", { name: "Condition 2 value" }).fill("Aria Audio");
  await expect(preview).toContainText("4 matching products");

  // Switch to "any" -> union is back to at least the tag count.
  await page.getByRole("combobox", { name: "Match mode" }).click();
  await page.getByRole("option", { name: "any condition" }).click();
  await expect.poll(count).toBeGreaterThanOrEqual(all);

  // Empty value shows a validation message; remove the row instead.
  await page.getByRole("textbox", { name: "Condition 2 value" }).fill("");
  await expect(preview).toContainText("Enter a value");
  await page.getByRole("button", { name: "Remove condition 2" }).click();
  await expect.poll(count).toBe(all);

  await submitAndWait(page, page.getByRole("button", { name: "Save conditions" }));
  await page.reload();
  await expect.poll(count).toBe(all);

  // The products list filter resolves the rule instead of membership rows.
  await page.goto("/admin/products?collection=audio", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(`${all} total`)).toBeVisible();
  await page.goto("/admin/products?collection=sale", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/^\d+ total$/)).not.toHaveText("0 total");
});

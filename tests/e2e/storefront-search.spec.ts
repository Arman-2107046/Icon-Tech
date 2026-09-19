import { expect, test } from "@playwright/test";

const go = (page: import("@playwright/test").Page, url: string) => page.goto(url, { waitUntil: "domcontentloaded" });

test.describe("search", () => {
  test("full-text results, typo fallback, empty state, pagination", async ({ page }) => {
    await go(page, "/search?q=wireless+keyboard");
    await expect(page.getByTestId("search-summary")).toContainText(/\d+ results? for “wireless keyboard”/);
    await expect(page.getByTestId("product-card").first()).toContainText("Keystone Low-Profile Wireless Keyboard");

    // Typo: no full-text hit, trigram fallback finds keyboards.
    await go(page, "/search?q=keybord");
    await expect(page.getByTestId("search-summary")).toContainText("showing close matches");
    await expect(page.getByTestId("product-card").first()).toContainText(/Keyboard/);

    // Vendor and tag words are indexed too.
    await go(page, "/search?q=volt");
    const n = Number((await page.getByTestId("search-summary").innerText()).split(" ")[0]);
    expect(n).toBeGreaterThanOrEqual(8);

    // Nothing.
    await go(page, "/search?q=xyzzyplugh");
    await expect(page.getByText("Nothing matched")).toBeVisible();

    // The form submits to the same page.
    await page.getByLabel("Search products").fill("desk lamp");
    await page.getByRole("search").getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/search\?q=desk\+lamp/);
    await expect(page.getByTestId("product-card").first()).toContainText("Plinth Desk Lamp");
  });
});

test("header instant search shows thumbnails and navigates", async ({ page }) => {
  await go(page, "/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const box = page.getByTestId("instant-search");
  await box.getByRole("combobox").fill("aria buds");
  const options = box.getByRole("option");
  await expect(options.first()).toContainText("Aria Buds Pro");
  await expect(options.first().locator("img")).toHaveCount(1);
  await expect(box.getByRole("link", { name: /All results for/ })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/products\/aria-buds-pro/);
});

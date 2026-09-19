import { expect, test } from "@playwright/test";

/** Designed empty states, all rendered with the shared illustration + CTA. */
test("empty states: 404 with chrome, search, checkout, cart, collection filters", async ({ page }) => {
  const res = await page.goto("/definitely-not-a-page", { waitUntil: "domcontentloaded" });
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("banner")).toBeVisible(); // storefront header, not the bare default
  await expect(page.getByText("Page not found")).toBeVisible();
  await expect(page.getByRole("link", { name: "Back home" })).toBeVisible();

  await page.goto("/search?q=zzqqxxyyvv", { waitUntil: "domcontentloaded" });
  const empty = page.getByTestId("search-empty");
  await expect(empty).toBeVisible();
  await expect(empty.locator("svg").first()).toBeVisible();
  await expect(empty.getByRole("link", { name: "New arrivals" })).toBeVisible();

  await page.goto("/checkout", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("checkout-empty")).toContainText("Your cart is empty");

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.getByTestId("cart-trigger").click();
  const cartEmpty = page.getByTestId("cart-empty");
  await expect(cartEmpty).toBeVisible();
  await expect(cartEmpty.locator("svg").first()).toBeVisible();
  await cartEmpty.getByRole("link", { name: "Browse new arrivals" }).click();
  await expect(page).toHaveURL(/\/collections\/new-arrivals/);
  await expect(page.getByTestId("cart-drawer")).toBeHidden();

  await page.goto("/collections/new-arrivals?min=99999999", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("collection-empty")).toBeVisible();
  await page.getByTestId("collection-empty").getByRole("link", { name: "Clear filters" }).click();
  await expect(page.getByTestId("product-card").first()).toBeVisible();
});

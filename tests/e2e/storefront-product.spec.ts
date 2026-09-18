import { expect, test } from "@playwright/test";

const go = (page: import("@playwright/test").Page, url: string) => page.goto(url, { waitUntil: "domcontentloaded" });

test.describe("product page", () => {
  test("variant picker updates price, stock and URL without navigation; unavailable values struck through", async ({ page }) => {
    await go(page, "/products/keystone-75-mechanical-keyboard");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Keystone 75 Mechanical Keyboard");
    await page.waitForLoadState("networkidle"); // hydrated before interacting

    // Default: first purchasable variant (Linear / Charcoal, 1 left).
    const price = page.getByTestId("product-price");
    await expect(price).toContainText("৳16,800.00");
    await expect(page.getByTestId("stock-status")).toHaveText("Only 1 left");

    // With Linear selected, Ivory is sold out: disabled + struck through, still visible.
    const ivory = page.getByTestId("option-Colour").getByRole("button", { name: "Ivory" });
    await expect(ivory).toBeVisible();
    await expect(ivory).toHaveAttribute("data-available", "false");
    await expect(ivory).toHaveClass(/line-through/);

    // Choose Silent Linear: +৳900 surcharge, plenty of stock, Ivory becomes available.
    await page.evaluate(() => {
      (window as unknown as { __marker: number }).__marker = 42;
    });
    await page.getByTestId("option-Switch").getByRole("button", { name: "Silent Linear" }).click();
    await expect(price).toContainText("৳17,700.00");
    await expect(page.getByTestId("stock-status")).toHaveText("In stock");
    await expect(ivory).toHaveAttribute("data-available", "true");
    await expect.poll(() => page.url()).toMatch(/\?variant=/);
    // Same document: a full navigation would have reset the window marker.
    expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(42);

    // Reloading the URL restores the selection.
    const url = page.url();
    await go(page, url);
    await expect(page.getByTestId("option-Switch").getByRole("button", { name: "Silent Linear" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("add-to-cart")).toBeEnabled();

    // Unknown handle 404s.
    await go(page, "/products/nope");
    await expect(page.getByText("Page not found")).toBeVisible();
  });

  test("sticky add-to-cart bar appears on mobile after scrolling past the button", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    await go(page, "/products/aria-buds-pro");
    const bar = page.getByTestId("sticky-bar");
    await expect(bar).toHaveAttribute("aria-hidden", "true");
    await page.getByRole("heading", { name: "About this product" }).scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 600);
    await expect(bar).toHaveAttribute("aria-hidden", "false");
    await expect(bar.getByRole("button", { name: "Add to cart" })).toBeVisible();
  });
});

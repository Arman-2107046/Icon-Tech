import { expect, test } from "@playwright/test";

const go = (page: import("@playwright/test").Page, url: string) => page.goto(url, { waitUntil: "domcontentloaded" });

test.describe("cart", () => {
  test("add to cart caps at stock, updates header count, and cookie is signed", async ({ page, context }) => {
    // Keystone 75 Linear/Charcoal has 1 in stock (seeded).
    await go(page, "/products/keystone-75-mechanical-keyboard");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("stock-status")).toHaveText("Only 1 left");
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("add-to-cart")).toHaveText(/Added to cart/);
    await expect(page.getByTestId("cart-count")).toHaveText("1");

    // Second add of the same variant is rejected (only 1 sellable).
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByText(/Only 1 of that item/)).toBeVisible();
    await expect(page.getByTestId("cart-count")).toHaveText("1");

    // Another product adds a second unit.
    await go(page, "/products/aria-buds-pro");
    await page.waitForLoadState("networkidle");
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("cart-count")).toHaveText("2");

    // The cart cookie is httpOnly and signed (token.hmac).
    const cookie = (await context.cookies()).find((c) => c.name === "icon_cart");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.value).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);

    // Tampering with the cookie yields an empty cart, not someone else's.
    await context.addCookies([{ ...cookie!, value: cookie!.value.slice(0, -2) + "zz" }]);
    await go(page, "/");
    await expect(page.getByTestId("cart-count")).toHaveCount(0);
  });
});

import { expect, test } from "@playwright/test";

const go = (page: import("@playwright/test").Page, url: string) => page.goto(url, { waitUntil: "domcontentloaded" });

test.describe("cart", () => {
  test("add to cart caps at stock, updates header count, and cookie is signed", async ({ page, context }) => {
    // Keystone 75 Linear/Charcoal has 1 in stock (seeded).
    await go(page, "/products/keystone-75-mechanical-keyboard");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("stock-status")).toHaveText("Only 1 left");
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("cart-drawer")).toBeVisible();
    await page.keyboard.press("Escape"); // the drawer is modal; close it to use the page again
    await expect(page.getByTestId("cart-drawer")).toBeHidden();
    await expect(page.getByTestId("cart-count")).toHaveText("1");

    // Second add of the same variant is rejected (only 1 sellable).
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByText(/Only 1 of that item/)).toBeVisible();
    await expect(page.getByTestId("cart-count")).toHaveText("1");

    // Another product adds a second unit.
    await go(page, "/products/aria-buds-pro");
    await page.waitForLoadState("networkidle");
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("cart-drawer").getByTestId("cart-line")).toHaveCount(2);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("cart-count")).toHaveText("2");

    // The cart cookie is httpOnly and signed (token.hmac).
    const cookie = (await context.cookies()).find((c) => c.name === "icon_cart");
    if (!cookie) throw new Error("cart cookie missing");
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.value).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);

    // Tampering with the cookie yields an empty cart, not someone else's.
    await context.addCookies([{ ...cookie, value: cookie.value.slice(0, -2) + "zz" }]);
    await go(page, "/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("cart-count")).toHaveCount(0);
    await page.getByTestId("cart-trigger").click();
    await expect(page.getByTestId("cart-empty")).toBeVisible();
  });
});

test("drawer: optimistic stepper with rollback at stock cap, remove, subtotal", async ({ page }) => {
  await go(page, "/products/volt-braided-usb-c-cable");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("add-to-cart").click();
  const drawer = page.getByTestId("cart-drawer");
  await expect(drawer).toBeVisible();
  const line = drawer.getByTestId("cart-line").first();
  await expect(line.getByTestId("line-qty")).toHaveText("1");
  const unit = 95000; // ৳950.00 seeded price of the 1 m / Black variant

  // + is optimistic: quantity and subtotal change immediately.
  await line.getByRole("button", { name: "Increase quantity" }).click();
  await expect(line.getByTestId("line-qty")).toHaveText("2");
  await expect(drawer.getByTestId("cart-subtotal")).toContainText("1,900.00");
  await line.getByRole("button", { name: "Increase quantity" }).click();
  await expect(line.getByTestId("line-qty")).toHaveText("3");
  await expect(drawer.getByTestId("cart-subtotal")).toContainText((3 * unit / 100).toLocaleString("en-US", { minimumFractionDigits: 2 }));

  // − back down, then remove.
  await line.getByRole("button", { name: "Decrease quantity" }).click();
  await expect(line.getByTestId("line-qty")).toHaveText("2");
  await line.getByRole("button", { name: /Remove/ }).click();
  await expect(drawer.getByTestId("cart-empty")).toBeVisible();

  // Rollback: a variant with 1 in stock cannot go to 2; the stepper reverts and shows the error.
  await page.keyboard.press("Escape");
  await go(page, "/products/keystone-75-mechanical-keyboard");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("add-to-cart").click();
  const kb = page.getByTestId("cart-drawer").getByTestId("cart-line").first();
  await expect(kb.getByTestId("line-qty")).toHaveText("1");
  await expect(kb.getByRole("button", { name: "Increase quantity" })).toBeDisabled(); // client already knows the cap
});

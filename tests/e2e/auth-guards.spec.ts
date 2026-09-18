import { expect, test } from "@playwright/test";

test.describe("route guards", () => {
  test("anonymous /admin redirects to /admin/login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("anonymous /account redirects to /account/login with next param", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/account\/login\?next=%2Faccount$/);
  });

  test("a forged admin cookie is rejected by the layout, not just the proxy", async ({ page, context, baseURL }) => {
    await context.addCookies([
      { name: "icon_admin_session", value: "not-a-real-token", url: baseURL ?? "http://localhost:3100" },
    ]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

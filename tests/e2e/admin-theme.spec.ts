import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("admin@icontech.com.bd");
  await page.getByLabel("Password").fill("admin12345");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/);
}

async function pick(page: Page, label: string) {
  await page.getByRole("button", { name: "Change theme" }).first().click();
  await page.getByRole("menuitemradio", { name: label }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
}

const isDark = (page: Page) => page.evaluate(() => document.documentElement.classList.contains("dark"));
const bodyBg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.describe("admin theme", () => {
  test.use({ colorScheme: "dark" });

  test("follows the OS by default, can be forced light or dark, and persists", async ({ page }) => {
    await login(page);
    await page.goto("/admin/customers");

    // System + OS dark => whole admin dark (html.dark, dark body).
    expect(await isDark(page)).toBe(true);
    const darkBg = await bodyBg(page);

    await pick(page, "Light");
    await expect.poll(() => isDark(page)).toBe(false);
    const lightBg = await bodyBg(page);
    expect(lightBg).not.toBe(darkBg);

    await pick(page, "Dark");
    await expect.poll(() => isDark(page)).toBe(true);

    // Persists across a full reload and is applied before hydration.
    await page.reload();
    expect(await isDark(page)).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem("icon-admin-theme"))).toBe("dark");

    // Sidebar and content share the same scheme: both backgrounds are dark.
    const sidebarBg = await page.locator('[data-slot="sidebar-inner"]').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(sidebarBg).not.toBe(lightBg);
  });
});

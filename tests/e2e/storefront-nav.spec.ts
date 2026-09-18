import { expect, test } from "@playwright/test";

test.describe("storefront navigation", () => {
  test("desktop menu flyout and mobile drawer", async ({ page, isMobile }) => {
    await page.goto("/");
    if (!isMobile) {
      await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Shop" }).hover();
      await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Audio" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();
      return;
    }
    await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
    await page.getByRole("button", { name: "Open menu" }).click();
    const dialog = page.getByRole("dialog", { name: "Menu" });
    await expect(dialog).toBeVisible();
    await dialog.getByText("Shop", { exact: true }).click(); // expands the group
    await expect(dialog.getByRole("link", { name: "Audio" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await page.getByRole("button", { name: "Open menu" }).click();
    await dialog.getByRole("link", { name: "About", exact: true }).click();
    await expect(page).toHaveURL(/\/pages\/about$/);
    await expect(dialog).toBeHidden(); // closed on navigation
  });
});

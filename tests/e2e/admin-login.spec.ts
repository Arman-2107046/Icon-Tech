import { expect, test } from "@playwright/test";

const EMAIL = "admin@icontech.com.bd";
const PASSWORD = "admin12345";

test.describe("admin login", () => {
  test("rejects a wrong password without leaking which field was wrong", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("signs in, lands on /admin, and can sign out", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText(`Signed in as ${EMAIL}`)).toBeVisible();

    // On narrow viewports the sidebar is an off-canvas sheet; open it first.
    const signOut = page.getByRole("button", { name: "Sign out" });
    if (!(await signOut.isVisible())) {
      await page.getByRole("button", { name: "Toggle Sidebar" }).click();
    }
    await signOut.click();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

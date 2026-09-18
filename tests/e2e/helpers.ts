import { expect, type Locator, type Page } from "@playwright/test";

export const ADMIN_EMAIL = "admin@icontech.com.bd";
export const ADMIN_PASSWORD = "admin12345";

export async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/);
}

/**
 * Click a submit button and wait for the Server Action round-trip to
 * finish, so a following reload sees the saved state.
 */
export async function submitAndWait(page: Page, button: Locator) {
  const response = page.waitForResponse((r) => r.request().method() === "POST" && r.status() < 400);
  await button.click();
  await response;
  await expect(button).toBeEnabled();
}

/** Run an interaction that fires a Server Action and wait for its response. */
export async function actAndWait(page: Page, act: () => Promise<void>) {
  const response = page.waitForResponse((r) => r.request().method() === "POST" && r.status() < 400);
  await act();
  await response;
}

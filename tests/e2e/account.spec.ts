import { expect, test, type Page } from "@playwright/test";

/**
 * Magic-link login, guest-cart merge, and the account area. The dev server
 * has no email provider, so the login page shows the link inline.
 */
const EMAIL = `e2e-account-${Date.now()}@example.com`;

async function addBackpack(page: Page) {
  await page.goto("/products/porter-tech-backpack", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.getByTestId("option-Colour").getByRole("button", { name: "Navy" }).click();
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("cart-drawer").getByTestId("line-qty")).toHaveText("1");
}

async function loginViaMagicLink(page: Page, email: string, next?: string) {
  await page.goto(next ? `/account/login?next=${encodeURIComponent(next)}` : "/account/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByTestId("link-sent")).toBeVisible();
  await page.goto(await devLinkPath(page));
}

/** The dev link is absolute (NEXT_PUBLIC_SITE_URL); the test server may sit on another port. */
async function devLinkPath(page: Page): Promise<string> {
  const href = (await page.getByTestId("dev-link").getAttribute("href")) ?? "";
  expect(href).toContain("/account/verify?token=");
  const u = new URL(href);
  return u.pathname + u.search;
}

test.describe.configure({ mode: "serial" });

test("rejects a bad email and a forged token", async ({ page }) => {
  await page.goto("/account/login");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByText("Enter a valid email address")).toBeVisible();
  await page.goto("/account/verify?token=nope&email=x%40example.com");
  await expect(page).toHaveURL(/\/account\/login\?error=invalid/);
  await expect(page.getByText("That sign-in link is not valid")).toBeVisible();
});

test("magic link signs in and merges the guest cart", async ({ page }) => {
  await addBackpack(page);
  await loginViaMagicLink(page, EMAIL, "/account/addresses");
  await expect(page).toHaveURL(/\/account\/addresses/);
  await expect(page.getByRole("heading", { name: "Addresses" })).toBeVisible();
  // The guest cart survived login.
  await page.goto("/");
  await expect(page.getByTestId("cart-count")).toHaveText("1");
  // Signed-in visitors are bounced off the login page.
  await page.goto("/account/login");
  await expect(page).toHaveURL(/\/account$/);
  await page.context().clearCookies();
});

test("used link cannot sign in again", async ({ page }) => {
  await page.goto("/account/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  const href = await devLinkPath(page);
  await page.goto(href);
  await expect(page).toHaveURL(/\/account$/);
  await page.context().clearCookies();
  await page.goto(href);
  await expect(page).toHaveURL(/error=used/);
});

test("address book CRUD and orders list", async ({ page }) => {
  await loginViaMagicLink(page, EMAIL);
  await page.goto("/account/addresses");
  await page.getByRole("button", { name: "Add address" }).click();
  await page.getByLabel("First name").fill("Rafi");
  await page.getByLabel("Last name").fill("Ahmed");
  await page.getByLabel("Address", { exact: true }).fill("12 Gulshan Avenue");
  await page.getByLabel("City").fill("Dhaka");
  await page.getByRole("button", { name: "Save address" }).click();
  const card = page.getByTestId("address-card");
  await expect(card).toHaveCount(1);
  await expect(card.first()).toContainText("12 Gulshan Avenue");
  await expect(card.first()).toContainText("Default");

  await card.first().getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("City").fill("Chattogram");
  await page.getByRole("button", { name: "Save address" }).click();
  await expect(card.first()).toContainText("Chattogram");

  await card.first().getByRole("button", { name: "Remove" }).click();
  await expect(card).toHaveCount(0);

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Your orders" })).toBeVisible();
  await expect(page.getByText("No orders yet")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/account\/login/);
});

test("rate limit: at most three links per email in a window", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "One project is enough; both share the per-IP budget.");
  const email = `e2e-limit-${Date.now()}@example.com`;
  let sent = 0;
  let refused = false;
  for (let i = 0; i < 4 && !refused; i++) {
    await page.goto("/account/login");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    const outcome = page.getByTestId("link-sent").or(page.getByText("Too many sign-in links"));
    await expect(outcome.first()).toBeVisible();
    if (await page.getByTestId("link-sent").isVisible()) sent++;
    else refused = true;
  }
  expect(refused).toBe(true);
  expect(sent).toBeLessThanOrEqual(3);
});

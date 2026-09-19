import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("admin@icontech.com.bd");
  await page.getByLabel("Password").fill("admin12345");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe("admin data table (customers)", () => {
  test("search, sort, filter and paginate through the URL", async ({ page }) => {
    await login(page);
    await page.goto("/admin/customers");
    await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();
    // Seeded with 60 customers; e2e runs add more, so read the total from the page.
    const summary = page.getByText(/1–25 of \d+/);
    await expect(summary).toBeVisible();
    const total = Number(/of (\d+)/.exec(await summary.innerText())?.[1]);
    expect(total).toBeGreaterThanOrEqual(60);

    // Paginate.
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(new RegExp(`26–50 of ${total}`))).toBeVisible();

    // Sort by email ascending resets the page.
    await page.getByRole("button", { name: "Email" }).click();
    await expect(page).toHaveURL(/sort=email/);
    await expect(page).toHaveURL(/dir=asc/);
    await expect(page).not.toHaveURL(/page=/);
    const firstEmail = await page.locator("tbody tr").first().locator("td").nth(1).innerText();
    expect(firstEmail.charCodeAt(0)).toBeLessThanOrEqual("m".charCodeAt(0));

    // Search narrows the results.
    await page.getByLabel("Search").fill("rahman");
    await expect(page).toHaveURL(/q=rahman/);
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toContainText(/rahman/i);
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(25); // one page at most (e2e runs add Rahmans over time)

    // Clear resets everything.
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page).not.toHaveURL(/q=/);
    await expect(page.getByText(new RegExp(`1–25 of ${total}`))).toBeVisible();
  });
});

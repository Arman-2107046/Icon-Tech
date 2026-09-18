import { expect, test } from "@playwright/test";

const go = (page: import("@playwright/test").Page, url: string) => page.goto(url, { waitUntil: "domcontentloaded" });

test.describe("collection page", () => {
  test("filters, sort and pagination live in the URL", async ({ page, isMobile }) => {
    await go(page, "/collections/desk-setup-essentials");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Desk Setup Essentials");
    const count = page.getByTestId("result-count");
    await expect(count).toContainText("9 products");

    // Manual collection keeps its admin order under "Featured".
    const first = page.getByTestId("product-card").first();
    await expect(first).toContainText("Plinth Laptop Stand");

    // Price filter via the form (open the mobile disclosure if needed).
    if (isMobile) await page.getByText(/^Filters/).click();
    const form = page.getByTestId("collection-filters").locator("visible=true").first();
    await form.getByLabel("Maximum price").fill("5000");
    await form.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/max=5000/);
    await expect(count).not.toContainText("9 products");
    await expect(page.getByRole("link", { name: /Remove filter Up to/ })).toBeVisible();

    // Chip removes the filter.
    await page.getByRole("link", { name: /Remove filter Up to/ }).click();
    await expect(page).not.toHaveURL(/max=/);
    await expect(count).toContainText("9 products");

    // Sort by price ascending: first card is the cheapest.
    await page.getByLabel("Sort products").selectOption("price-asc");
    await expect(page).toHaveURL(/sort=price-asc/);
    await expect(page.getByTestId("product-card").first()).toContainText("Glide Desk Mat");

    // Option facet: Finish = Silver narrows to Plinth products with that finish.
    if (isMobile) await page.getByText(/^Filters/).click();
    const form2 = page.getByTestId("collection-filters").locator("visible=true").first();
    await form2.getByLabel("Silver", { exact: true }).check();
    await form2.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/Finish=Silver/);
    await expect(page).toHaveURL(/sort=price-asc/); // sort preserved
    await expect(page.getByRole("link", { name: "Remove filter Finish: Silver" })).toBeVisible();
    const n = Number((await count.innerText()).split(" ")[0]);
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(9);

    // Back button restores the previous state.
    await page.goBack();
    await expect(page).not.toHaveURL(/Finish=/);
    await expect(count).toContainText("9 products");
  });

  test("rule collection resolves and paginates", async ({ page }) => {
    await go(page, "/collections/audio?page=99");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Audio");
    // Out-of-range page clamps to the last page rather than 404ing.
    await expect(page.getByTestId("product-card").first()).toBeVisible();
    await go(page, "/collections/does-not-exist");
    await expect(page.getByText(/not found/i).first()).toBeVisible();
  });
});

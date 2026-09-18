import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("admin@icontech.com.bd");
  await page.getByLabel("Password").fill("admin12345");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe("admin products", () => {
  test("create with auto handle, reject duplicate handle, edit", async ({ page }) => {
    await login(page);
    const stamp = Date.now().toString(36);
    const title = `E2E Test Speaker ${stamp}`;

    await page.goto("/admin/products/new");
    await page.getByRole("textbox", { name: "Title", exact: true }).fill(title);
    await page.getByRole("textbox", { name: "Tags" }).fill("Audio, e2e, Audio");
    await page.getByRole("button", { name: "Create product" }).click();
    await page.waitForURL(/\/admin\/products\/[a-z0-9]+$/);
    await expect(page.getByRole("textbox", { name: "Handle" })).toHaveValue(`e2e-test-speaker-${stamp}`);
    await expect(page.getByRole("textbox", { name: "Tags" })).toHaveValue("audio, e2e");
    const editUrl = page.url();

    // Duplicate handle is reported on the field.
    await page.goto("/admin/products/new");
    await page.getByRole("textbox", { name: "Title", exact: true }).fill("Another");
    await page.getByRole("textbox", { name: "Handle" }).fill(`e2e-test-speaker-${stamp}`);
    await page.getByRole("button", { name: "Create product" }).click();
    await expect(page.getByText("This handle is already taken")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Title", exact: true })).toHaveValue("Another"); // values preserved

    // Edit persists.
    await page.goto(editUrl);
    await page.getByRole("textbox", { name: "Vendor" }).fill("E2E Vendor");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Vendor" })).toHaveValue("E2E Vendor");

    // Shows up in the list via search.
    await page.goto(`/admin/products?q=${stamp}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(title)).toBeVisible();
  });
});

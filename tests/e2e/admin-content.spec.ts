import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("admin@icontech.com.bd");
  await page.getByLabel("Password").fill("admin12345");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/);
}

test("pages: create as draft, publish, duplicate handle, delete", async ({ page }) => {
  await login(page);
  const stamp = Date.now().toString(36);
  await page.goto("/admin/pages/new");
  await page.getByRole("textbox", { name: "Title", exact: true }).fill(`E2E Page ${stamp}`);
  await page.getByRole("textbox", { name: "Body" }).fill("## Hello\n\nSome **markdown**.");
  await page.getByRole("button", { name: "Create page" }).click();
  await page.waitForURL(/\/admin\/pages\/[a-z0-9]+$/);
  await expect(page.getByRole("textbox", { name: "Handle" })).toHaveValue(`e2e-page-${stamp}`);
  await expect(page.getByRole("checkbox", { name: "Published" })).not.toBeChecked();

  await page.getByRole("checkbox", { name: "Published" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Published" })).toBeChecked();
  await expect(page.getByRole("textbox", { name: "Body" })).toHaveValue("## Hello\n\nSome **markdown**.");

  await page.goto("/admin/pages/new");
  await page.getByRole("textbox", { name: "Title", exact: true }).fill("Dup");
  await page.getByRole("textbox", { name: "Handle" }).fill(`e2e-page-${stamp}`);
  await page.getByRole("button", { name: "Create page" }).click();
  await expect(page.getByText("This handle is already taken")).toBeVisible();

  await page.goto(`/admin/pages?q=e2e-page-${stamp}`);
  await expect(page.locator("tbody tr").first()).toContainText("Published");
  await page.locator("tbody tr").first().getByRole("link").first().click();
  await page.waitForURL(/\/admin\/pages\/[a-z0-9]+$/);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete" }).click();
  await page.waitForURL(/\/admin\/pages$/);
  await page.goto(`/admin/pages?q=e2e-page-${stamp}`);
  await expect(page.getByText("No pages match.")).toBeVisible();
});

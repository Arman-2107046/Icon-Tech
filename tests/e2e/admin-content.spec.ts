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

test("menus: create menu, nested items, reorder, delete", async ({ page }) => {
  await login(page);
  const stamp = Date.now().toString(36);
  await page.goto("/admin/menus");

  await page.getByRole("button", { name: "Add menu" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Title" }).fill(`E2E Menu ${stamp}`);
  await dialog.getByRole("button", { name: "Create menu" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const menu = page.getByTestId("menu").filter({ hasText: `E2E Menu ${stamp}` });
  await expect(menu).toContainText(`e2e-menu-${stamp}`);

  const addItem = async (label: string, url: string, parent?: string) => {
    await menu.getByRole("button", { name: "Add item" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "Label" }).fill(label);
    await dialog.getByRole("textbox", { name: "URL" }).fill(url);
    if (parent) {
      await dialog.getByRole("combobox", { name: "Parent" }).click();
      await page.getByRole("option", { name: parent }).click();
    }
    await dialog.getByRole("button", { name: "Create item" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  };

  await addItem("Shop", "/collections/new-arrivals");
  await addItem("About", "/pages/about");
  await addItem("Audio", "/collections/audio", "Shop");
  const items = menu.getByTestId("menu-item");
  await expect(items).toHaveCount(3);
  await expect(items.nth(1)).toHaveAttribute("data-depth", "1"); // Audio nests under Shop
  await expect(items.nth(1)).toContainText("Audio");

  // Invalid URL rejected.
  await menu.getByRole("button", { name: "Add item" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Label" }).fill("Bad");
  await dialog.getByRole("textbox", { name: "URL" }).fill("not a url");
  await dialog.getByRole("button", { name: "Create item" }).click();
  await expect(dialog.getByText(/Use a path like/)).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();

  // Move About above Shop.
  await menu.getByRole("button", { name: "Move About up" }).click();
  await expect(items.nth(0)).toContainText("About");
  await expect(items.nth(1)).toContainText("Shop");

  page.on("dialog", (d) => d.accept());
  await menu.getByRole("button", { name: "Delete item Shop" }).click();
  await expect(items).toHaveCount(1); // Audio cascades
  await menu.getByRole("button", { name: `Delete menu E2E Menu ${stamp}` }).click();
  await expect(page.getByTestId("menu").filter({ hasText: `E2E Menu ${stamp}` })).toHaveCount(0);
});

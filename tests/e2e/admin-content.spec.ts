import { expect, test } from "@playwright/test";
import { login, submitAndWait } from "./helpers";

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
  await submitAndWait(page, page.getByRole("button", { name: "Save changes" }));
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Published" })).toBeChecked();
  await expect(page.getByRole("textbox", { name: "Body" })).toHaveValue("## Hello\n\nSome **markdown**.");

  await page.goto("/admin/pages/new");
  await page.getByRole("textbox", { name: "Title", exact: true }).fill("Dup");
  await page.getByRole("textbox", { name: "Handle" }).fill(`e2e-page-${stamp}`);
  await page.getByRole("button", { name: "Create page" }).click();
  await expect(page.getByText("This handle is already taken")).toBeVisible();

  await page.goto(`/admin/pages?q=e2e-page-${stamp}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("tbody tr").first()).toContainText("Published");
  await page.locator("tbody tr").first().getByRole("link").first().click();
  await page.waitForURL(/\/admin\/pages\/[a-z0-9]+$/);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete" }).click();
  await page.waitForURL(/\/admin\/pages$/);
  await page.goto(`/admin/pages?q=e2e-page-${stamp}`, { waitUntil: "domcontentloaded" });
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

test("settings: store info, checkout, and homepage section order persist", async ({ page }) => {
  await login(page);
  await page.goto("/admin/settings");

  // Store info with an invalid email is rejected on the field; then saved.
  const tagline = `Tagline ${Date.now().toString(36)}`;
  await page.getByRole("textbox", { name: "Tagline" }).fill(tagline);
  await page.getByRole("textbox", { name: "Contact email" }).fill("nope");
  await page.getByRole("button", { name: "Save store" }).click();
  await expect(page.getByText("Enter a valid email")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Tagline" })).toHaveValue(tagline);
  await page.getByRole("textbox", { name: "Contact email" }).fill("hello@icontech.com.bd");
  await submitAndWait(page, page.getByRole("button", { name: "Save store" }));
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Tagline" })).toHaveValue(tagline);

  // Checkout threshold.
  await page.getByRole("textbox", { name: /Free-shipping banner threshold/ }).fill("7500");
  await submitAndWait(page, page.getByRole("button", { name: "Save checkout" }));
  await page.reload();
  await expect(page.getByRole("textbox", { name: /Free-shipping banner threshold/ })).toHaveValue("7500.00");
  await page.getByRole("textbox", { name: /Free-shipping banner threshold/ }).fill("5000");
  await page.getByRole("button", { name: "Save checkout" }).click();

  // Homepage sections: move the first section down and disable it.
  const sections = page.getByTestId("homepage-section");
  const firstType = await sections.nth(0).getAttribute("data-type");
  await page.getByRole("button", { name: "Move section 1 down" }).click();
  await expect(sections.nth(1)).toHaveAttribute("data-type", firstType ?? "");
  await submitAndWait(page, page.getByRole("button", { name: "Save sections" }));
  await page.reload();
  await expect(page.getByTestId("homepage-section").nth(1)).toHaveAttribute("data-type", firstType ?? "");
  // Restore.
  await page.getByRole("button", { name: "Move section 2 up" }).click();
  await submitAndWait(page, page.getByRole("button", { name: "Save sections" }));
  await page.reload();
  await expect(page.getByTestId("homepage-section").nth(0)).toHaveAttribute("data-type", firstType ?? "");
});

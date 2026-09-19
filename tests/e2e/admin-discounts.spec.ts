import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("discounts: create, validate, edit, delete", async ({ page }) => {
  await login(page);
  await page.goto("/admin/discounts");
  const code = `E2E${Date.now().toString(36).slice(-5).toUpperCase()}`;

  await page.getByRole("button", { name: "Add discount" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Code" }).fill(code.toLowerCase());
  await dialog.getByRole("textbox", { name: "Title" }).fill("E2E welcome");
  await dialog.getByRole("textbox", { name: "Value" }).fill("150");
  await dialog.getByRole("button", { name: "Create discount" }).click();
  await expect(dialog.getByText("Percentage cannot exceed 100")).toBeVisible();
  await dialog.getByRole("textbox", { name: "Value" }).fill("15");
  await dialog.getByRole("textbox", { name: "Total uses" }).fill("100");
  await dialog.getByRole("button", { name: "Create discount" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const row = page.getByTestId("discount-row").filter({ hasText: code });
  await expect(row).toBeVisible();
  await expect(row).toContainText("15% off");
  await expect(row).toContainText("0 / 100");
  await expect(row).toContainText("Exclusive");
  await expect(row).toContainText("Active");

  // Duplicate code is rejected on the field.
  await page.getByRole("button", { name: "Add discount" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Code" }).fill(code);
  await dialog.getByRole("textbox", { name: "Title" }).fill("dup");
  await dialog.getByRole("textbox", { name: "Value" }).fill("5");
  await dialog.getByRole("button", { name: "Create discount" }).click();
  await expect(dialog.getByText("A discount with this code already exists")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Edit: make it stackable and inactive.
  await row.getByRole("button", { name: `Edit discount ${code}` }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: /Can be combined/ }).check();
  await dialog.getByRole("checkbox", { name: "Active" }).uncheck();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row).toContainText("Stackable");
  await expect(row).toContainText("Inactive");

  page.on("dialog", (d) => d.accept());
  await row.getByRole("button", { name: `Delete discount ${code}` }).click();
  await expect(row).toHaveCount(0);
});

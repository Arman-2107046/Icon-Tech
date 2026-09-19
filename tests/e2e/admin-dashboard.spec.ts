import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("dashboard shows five metrics, a revenue chart, top products and low stock", async ({ page }) => {
  await login(page);
  const stats = page.getByTestId("dashboard-stats");
  await expect(stats).toBeVisible();
  for (const label of ["Revenue", "Orders", "Average order", "Awaiting action", "Low stock"]) {
    await expect(stats.getByText(label, { exact: true })).toBeVisible();
  }
  const chart = page.getByTestId("revenue-chart");
  await expect(chart.getByRole("img", { name: "Revenue per day" })).toBeVisible();
  expect(await chart.locator("rect").count()).toBeGreaterThanOrEqual(30);
  // Orders placed by earlier specs make the top-products list non-empty.
  await expect(page.getByTestId("top-products").locator("li").first()).toContainText("sold");
  await expect(page.getByText("Low stock").nth(1)).toBeVisible();
  await stats.getByRole("link", { name: /Awaiting action/ }).click();
  await expect(page).toHaveURL(/\/admin\/orders\?fulfillment=UNFULFILLED/);
});

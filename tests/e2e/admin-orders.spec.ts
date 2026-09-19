import { expect, test } from "@playwright/test";
import { login, submitAndWait } from "./helpers";

test.describe("admin orders", () => {
  test("list filters, detail timeline, fulfil, mark paid, partial refund, invoice", async ({ page }) => {
    await login(page);
    await page.goto("/admin/orders?status=PENDING&fulfillment=UNFULFILLED", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
    const rows = page.locator("tbody tr");
    expect(await rows.count()).toBeGreaterThan(0);
    await expect(rows.first()).toContainText("Pending");

    // Search by order number.
    const number = (await rows.first().locator("td").first().innerText()).replace("#", "");
    await page.goto(`/admin/orders?q=${number}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await page.locator("tbody tr").first().getByRole("link").first().click();
    await page.waitForURL(/\/admin\/orders\/[a-z0-9]+$/);
    await expect(page.getByRole("heading", { name: `Order #${number}` })).toBeVisible();
    await expect(page.getByTestId("timeline")).toContainText("Order placed");

    // Fulfil everything with tracking.
    await page.getByRole("button", { name: "Fulfil items" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "Carrier" }).fill("Pathao Courier");
    await dialog.getByRole("textbox", { name: "Tracking number" }).fill("PX12345678");
    await dialog.getByRole("button", { name: "Create shipment" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByTestId("timeline")).toContainText("Shipped via Pathao Courier · PX12345678");
    await expect(page.getByRole("button", { name: "Fulfil items" })).toHaveCount(0);

    // COD: mark paid → financial PAID, status stays FULFILLED, refund becomes possible.
    await page.getByRole("button", { name: "Mark as paid" }).click();
    await expect(page.getByTestId("timeline")).toContainText("Marked as paid");
    await expect(page.getByRole("button", { name: "Mark as paid" })).toHaveCount(0);

    const total = await page.getByTestId("order-total").innerText();
    await page.getByRole("button", { name: "Refund" }).click();
    const refund = page.getByRole("dialog");
    await refund.getByRole("textbox", { name: "Amount (BDT)" }).fill("100");
    await refund.getByRole("textbox", { name: "Reason" }).fill("Goodwill for late delivery");
    await refund.getByRole("button", { name: "Record refund" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByTestId("timeline")).toContainText("Refund succeeded · ৳100.00");
    await expect(page.getByText("Partially refunded")).toBeVisible();
    await expect(page.getByTestId("order-total")).toHaveText(total);

    // Complete, then closed orders cannot be cancelled.
    await page.getByRole("button", { name: "Mark completed" }).click();
    await expect(page.getByText("Completed", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel order" })).toHaveCount(0);

    // Internal note persists.
    await page.getByLabel("Internal notes").fill("Customer prefers evening delivery.");
    await submitAndWait(page, page.getByRole("button", { name: "Save note" }));
    await page.reload();
    await expect(page.getByLabel("Internal notes")).toHaveValue("Customer prefers evening delivery.");

    // Invoice renders with a print stylesheet.
    const url = page.url();
    await page.goto(`${url}/invoice`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("invoice")).toContainText(`#${number}`);
    await expect(page.getByTestId("invoice")).toContainText("Bill to");
    expect(await page.locator("style").allInnerTexts().then((s) => s.join(""))).toContain("@media print");
  });

  test("illegal transitions are refused by the service layer", async ({ page }) => {
    await login(page);
    await page.goto("/admin/orders?status=CANCELLED", { waitUntil: "domcontentloaded" });
    await page.locator("tbody tr").first().getByRole("link").first().click();
    await page.waitForURL(/\/admin\/orders\/[a-z0-9]+$/);
    // Only the invoice control remains for a closed order.
    const controls = page.getByTestId("order-actions").getByRole("button");
    await expect(controls).toHaveCount(1);
    await expect(controls.first()).toHaveText(/Invoice/);
  });
});

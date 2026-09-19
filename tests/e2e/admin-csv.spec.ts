import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("CSV: export products/orders, import validates then upserts by handle and SKU", async ({ page, request }) => {
  await login(page);

  // Exports need an admin session; the anonymous request is refused.
  expect((await request.get("/api/admin/export/products")).status()).toBe(401);
  const cookies = await page.context().cookies();
  const cookie = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const products = await request.get("/api/admin/export/products", { headers: { cookie } });
  expect(products.status()).toBe(200);
  expect(products.headers()["content-type"]).toContain("text/csv");
  const productCsv = await products.text();
  expect(productCsv.split("\n")[0]).toContain("handle,title,status,vendor,tags,description,variant_title,options,sku");
  expect(productCsv).toContain("porter-tech-backpack");
  const orders = await request.get("/api/admin/export/orders", { headers: { cookie } });
  expect(orders.status()).toBe(200);
  expect((await orders.text()).split("\n")[0]).toContain("number,placed_at,status");

  // Import: a bad row is reported and nothing is written.
  const stamp = Date.now().toString(36);
  const handle = `csv-import-${stamp}`;
  const sku1 = `CSV-${stamp}-BK`;
  const sku2 = `CSV-${stamp}-WH`;
  const bad = ["handle,title,status,price,sku,options,available", `${handle},CSV Import ${stamp},ACTIVE,abc,${sku1},Colour=Black,4`].join("\n");
  const badRes = await request.post("/api/admin/import/products", { headers: { cookie }, multipart: { file: { name: "bad.csv", mimeType: "text/csv", buffer: Buffer.from(bad) }, dryRun: "0" } });
  const badJson = (await badRes.json()) as { ok: boolean; data: { issues: { line: number; message: string }[] } };
  expect(badJson.data.issues[0]).toMatchObject({ line: 2 });
  expect(badJson.data.issues[0]?.message).toContain("price");

  // A good file through the UI: check, then import.
  const good = [
    "handle,title,status,vendor,tags,price,compare_at_price,sku,options,available",
    `${handle},CSV Import ${stamp},ACTIVE,Icon,"csv, import",1500,,${sku1},Colour=Black,4`,
    `${handle},CSV Import ${stamp},ACTIVE,Icon,"csv, import",1500,1800,${sku2},Colour=White,0`,
  ].join("\n");
  await page.goto("/admin/products");
  await page.getByRole("button", { name: "Import CSV" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("CSV file").setInputFiles({ name: "good.csv", mimeType: "text/csv", buffer: Buffer.from(good) });
  await expect(sheet.getByRole("button", { name: "Import", exact: true })).toBeDisabled();
  await sheet.getByRole("button", { name: "Check file" }).click();
  const summary = sheet.getByTestId("import-summary");
  await expect(summary).toContainText("Check complete");
  await expect(summary).toContainText("Products: 1 new");
  await expect(summary).toContainText("Variants: 2 new");
  await sheet.getByRole("button", { name: "Import", exact: true }).click();
  await expect(summary).toContainText("Import complete");
  await page.keyboard.press("Escape");

  await page.goto(`/admin/products?q=${handle}`);
  await page.getByRole("link", { name: `CSV Import ${stamp}` }).click();
  await expect(page.getByRole("cell", { name: "Black" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "White" })).toBeVisible();
  const productUrl = page.url();

  // Second import matches by SKU and updates the price and stock only.
  const update = ["handle,title,price,sku,available", `${handle},CSV Import ${stamp} (renamed),1750,${sku1},9`].join("\n");
  const upRes = await request.post("/api/admin/import/products", { headers: { cookie }, multipart: { file: { name: "up.csv", mimeType: "text/csv", buffer: Buffer.from(update) }, dryRun: "0" } });
  const up = (await upRes.json()) as { data: { productsUpdated: number; variantsUpdated: number; variantsCreated: number; issues: unknown[] } };
  expect(up.data).toMatchObject({ productsUpdated: 1, variantsUpdated: 1, variantsCreated: 0, issues: [] });
  await page.goto(productUrl);
  await expect(page.getByRole("heading", { name: `CSV Import ${stamp} (renamed)` })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Black price", exact: true })).toHaveValue("1750.00");
  await expect(page.getByRole("textbox", { name: "Black stock", exact: true })).toHaveValue("9");
  await expect(page.getByRole("textbox", { name: "White price", exact: true })).toHaveValue("1500.00");

  // Storefront sees the new product (tags expired by the import).
  await page.goto(`/products/${handle}`);
  await expect(page.getByRole("heading", { name: `CSV Import ${stamp} (renamed)` })).toBeVisible();
});

import { expect, test } from "@playwright/test";
import { PNG } from "pngjs";
import { actAndWait, login, submitAndWait } from "./helpers";

/** A 64×80 PNG with a red/blue split so the blurhash is non-trivial. */
function makePng(): Buffer {
  const png = new PNG({ width: 64, height: 80 });
  for (let y = 0; y < 80; y++) {
    for (let x = 0; x < 64; x++) {
      const i = (y * 64 + x) * 4;
      png.data[i] = x < 32 ? 220 : 30;
      png.data[i + 1] = 40;
      png.data[i + 2] = x < 32 ? 30 : 220;
      png.data[i + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

test("upload an image, edit its alt text, delete it", async ({ page }) => {
  await login(page);
  await page.goto("/admin/products/new");
  await page.getByRole("textbox", { name: "Title", exact: true }).fill(`E2E Media ${Date.now().toString(36)}`);
  await page.getByRole("button", { name: "Create product" }).click();
  await page.waitForURL(/\/admin\/products\/[a-z0-9]+$/);

  const items = page.getByTestId("media-item");
  await expect(items).toHaveCount(0);

  await page.getByLabel("Upload images").setInputFiles({ name: "split.png", mimeType: "image/png", buffer: makePng() });
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText("64 × 80");
  await expect(items.first().getByText("Cover")).toBeVisible();
  await expect(items.first()).toHaveAttribute("data-blurhash", /^[A-Za-z0-9#$%*+,\-.:;=?@\[\]^_{|}~]{20,}$/);
  const src = await items.first().locator("img").getAttribute("src");
  expect(src).toMatch(/^\/uploads\/\d{4}\/\d{2}\/[a-f0-9]{24}\.png$/);

  // The file is really served.
  const res = await page.request.get(src ?? "");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/png");

  // Alt text.
  await items.first().getByLabel("Alt text 1").fill("Red and blue split");
  await submitAndWait(page, items.first().getByRole("button", { name: "Save" }));
  await page.reload();
  await expect(page.getByTestId("media-item").first().getByLabel("Alt text 1")).toHaveValue("Red and blue split");
  await expect(page.getByTestId("media-item").first().locator("img")).toHaveAttribute("alt", "Red and blue split");

  // Delete removes the row and the file.
  await page.getByRole("button", { name: "Delete image 1" }).click();
  await expect(page.getByTestId("media-item")).toHaveCount(0);
  await expect.poll(async () => (await page.request.get(src ?? "")).status()).toBe(404);
});

test("reorder media by dragging and with the move buttons; order persists", async ({ page }) => {
  await login(page);
  await page.goto("/admin/products/new");
  await page.getByRole("textbox", { name: "Title", exact: true }).fill(`E2E Reorder ${Date.now().toString(36)}`);
  await page.getByRole("button", { name: "Create product" }).click();
  await page.waitForURL(/\/admin\/products\/[a-z0-9]+$/);

  const items = page.getByTestId("media-item");
  for (const name of ["a.png", "b.png", "c.png"]) {
    await page.getByLabel("Upload images").setInputFiles({ name, mimeType: "image/png", buffer: makePng() });
    await expect(items).toHaveCount(["a.png", "b.png", "c.png"].indexOf(name) + 1);
  }
  const ids = async () => items.evaluateAll((els) => els.map((el) => el.getAttribute("data-media-id")));
  const [a, b, c] = await ids();

  // Drag the third onto the first: c, a, b
  const settled = () => expect(page.getByRole("button", { name: "Move image 1 later" })).toBeEnabled();
  await actAndWait(page, () => items.nth(2).dragTo(items.nth(0)));
  await settled();
  await expect.poll(ids).toEqual([c, a, b]);

  // Move "a" (now second) later: c, b, a
  await actAndWait(page, () => page.getByRole("button", { name: "Move image 2 later" }).click());
  await settled();
  await expect.poll(ids).toEqual([c, b, a]);

  await page.reload();
  await expect.poll(ids).toEqual([c, b, a]);
  await expect(page.getByTestId("media-item").first().getByText("Cover")).toBeVisible();

  for (let i = 3; i > 0; i--) {
    await page.getByRole("button", { name: "Delete image 1" }).click();
    await expect(page.getByTestId("media-item")).toHaveCount(i - 1);
  }
});

import { expect, test, type Page } from "@playwright/test";

/** Layout stability + placeholder plumbing on the three image-heavy routes. */
async function cls(page: Page, url: string): Promise<number> {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        (window as unknown as { __cls: number }).__cls = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as (PerformanceEntry & { hadRecentInput: boolean; value: number })[]) {
            if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
        resolve();
      }),
  );
  await page.waitForLoadState("networkidle");
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(800);
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(800);
  return page.evaluate(() => (window as unknown as { __cls: number }).__cls);
}

test("images: blur placeholders, one priority image, CLS under budget", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "layout-shift entries are Chromium-only");
  for (const url of ["/", "/collections/new-arrivals", "/products/porter-tech-backpack"]) {
    const shift = await cls(page, url);
    expect(shift, `CLS on ${url}`).toBeLessThan(0.05);
  }

  await page.goto("/collections/new-arrivals", { waitUntil: "networkidle" });
  const cards = page.getByTestId("product-card");
  const first = cards.first().locator("img").first();
  // Blur placeholder is a tiny inline PNG behind the real image until it loads (stripped on load, so check the HTML).
  const html = await (await request.get("/collections/new-arrivals")).text();
  expect((html.match(/data:image\/png;base64,/g) ?? []).length).toBeGreaterThanOrEqual(8);
  // Only the LCP candidate is preloaded/eager; the rest lazy-load.
  expect((html.match(/<link[^>]+rel="preload"[^>]+as="image"/g) ?? []).length).toBe(1);
  expect(await first.getAttribute("loading")).not.toBe("lazy");
  expect(await cards.nth(3).locator("img").first().getAttribute("loading")).toBe("lazy");
  // Every card reserves a 4:5 box before the image arrives.
  const ratio = await cards.nth(1).locator("a").first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.height / r.width;
  });
  expect(ratio).toBeGreaterThan(1.2);
  expect(ratio).toBeLessThan(1.3);
});

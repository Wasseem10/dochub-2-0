import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

async function openTwoPages(page, mixedSizes = false) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let index = 1; index <= 2; index += 1) {
    pdf.addPage(mixedSizes && index === 2 ? [792, 612] : [612, 792]).drawText(`Scroll fixture page ${index}`, { x: 50, y: 500, font, size: 20 });
  }
  await page.goto("/edit-pdf");
  await page.locator('input[type="file"]').first().setInputFiles({ name: "two-page-scroll.pdf", mimeType: "application/pdf", buffer: Buffer.from(await pdf.save()) });
  await expect(page.locator('.page-surface[data-page-index="0"] .pdf-image')).toBeVisible();
}

test("scrolls through both PDF pages and back without using thumbnails", async ({ page }, testInfo) => {
  await openTwoPages(page);
  const viewport = page.locator(".canvas-column");
  const first = page.locator('.page-surface[data-page-index="0"]');
  const second = page.locator('.page-surface[data-page-index="1"]');
  await expect(page.locator(".page-surface")).toHaveCount(2);
  expect(await second.evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThan(await first.evaluate((el) => el.getBoundingClientRect().bottom));
  const scroll = async (distance) => {
    if (testInfo.project.use.isMobile) {
      await viewport.evaluate((element, delta) => element.scrollBy(0, delta), distance);
    } else {
      await viewport.hover();
      // Firefox caps a single wheel event; exercise ordinary repeated scrolling.
      for (let remaining = Math.abs(distance); remaining > 0; remaining -= 400) {
        await page.mouse.wheel(0, Math.sign(distance) * Math.min(remaining, 400));
        await page.waitForTimeout(100);
      }
    }
  };
  await scroll(1800);
  await expect(second).toHaveAttribute("data-active-page", "true");
  await expect(second).toBeInViewport({ ratio: 0.2 });
  await expect(second.locator(".pdf-image")).toBeVisible();
  await expect(page.locator('.thumbnail[aria-current="page"]')).toHaveAttribute("title", "Page 2");
  await page.screenshot({ path: testInfo.outputPath("scrolled-page-two.png") });
  await scroll(-2200);
  await expect(first).toHaveAttribute("data-active-page", "true");
  await expect(first).toBeInViewport({ ratio: 0.2 });
});

test("mixed page sizes keep a stable scale while scrolling", async ({ page }) => {
  // Ensure the two smaller pages cannot both fit inside a tall phone viewport.
  await page.setViewportSize({ width: page.viewportSize().width, height: 500 });
  await openTwoPages(page, true);
  const first = page.locator('.page-surface[data-page-index="0"]');
  const second = page.locator('.page-surface[data-page-index="1"]');
  const width = await first.evaluate((element) => element.getBoundingClientRect().width);
  await page.locator(".canvas-column").evaluate((element) => element.scrollTo(0, element.scrollHeight));
  await expect(second).toHaveAttribute("data-active-page", "true");
  await expect.poll(() => first.evaluate((element) => element.getBoundingClientRect().width)).toBe(width);
  await expect(second).toBeInViewport({ ratio: 0.2 });
});

test("touch swipes scroll to the second page", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "android-chromium", "Native touch input is exercised through Chromium's mobile protocol.");
  await openTwoPages(page);
  const client = await page.context().newCDPSession(page);
  const box = await page.locator(".canvas-column").boundingBox();
  const x = box.x + box.width / 2;
  // Start on the document, above the fixed mobile tool dock.
  const startY = box.y + box.height * 0.65;
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: startY }] });
  for (let step = 1; step <= 12; step += 1) {
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: startY - step * 30 }] });
    await page.waitForTimeout(20);
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator('.page-surface[data-page-index="1"]')).toHaveAttribute("data-active-page", "true");
  await client.detach();
});

test("thumbnail navigation scrolls to the page and second-page text stays on that page", async ({ page }) => {
  await openTwoPages(page);
  if (!(await page.getByRole("button", { name: /Page 2\. Use/ }).isVisible())) {
    await page.getByRole("button", { name: "Thumbnails", exact: true }).click();
  }
  await page.getByRole("button", { name: /Page 2\. Use/ }).click();
  const second = page.locator('.page-surface[data-page-index="1"]');
  await expect(second).toBeInViewport({ ratio: 0.2 });
  await expect(second.locator(".pdf-image")).toBeVisible();
  await page.getByRole("button", { name: "Add Text", exact: true }).click();
  await second.click({ position: { x: 90, y: 140 } });
  const input = second.locator('.text-content[contenteditable="plaintext-only"]').last();
  await expect(input).toBeFocused();
  await input.fill("SECOND PAGE ONLY");
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  const exported = await PDFDocument.load(await readFile(await (await pending).path()));
  expect(exported.getPageCount()).toBe(2);
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(await exported.save()), verbosity: 0 });
  const document = await task.promise;
  const text = async (n) => (await (await document.getPage(n)).getTextContent()).items.map((item) => item.str || "").join(" ");
  expect(await text(1)).not.toContain("SECOND PAGE ONLY");
  expect(await text(2)).toContain("SECOND PAGE ONLY");
  await task.destroy();
  await page.reload();
  await expect(page.locator(".page-surface")).toHaveCount(2);
});

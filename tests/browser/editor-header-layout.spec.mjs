import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const fixture = await readFile(new URL("../../runtime-public/research/fixtures/simple-searchable.pdf", import.meta.url));
const longName = "Synthetic quarterly review with a deliberately long document name.pdf";

test("editor header keeps the brand, filename and actions separate at phone and tablet widths", async ({ page }, testInfo) => {
  await page.goto("/edit-pdf");
  await page.locator('input[type="file"]').first().setInputFiles({ name: longName, mimeType: "application/pdf", buffer: fixture });
  await expect(page.getByRole("img", { name: "PDF page 1", exact: true })).toBeVisible();
  for (const width of [320, 360, 390, 600, 768, 900, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: testInfo.outputPath(`header-${width}.png`), clip: width === 390 ? { x: 0, y: 0, width, height: 260 } : undefined });
    const layout = await page.locator(".reference-file-header").evaluate((header) => {
      const rect = (selector) => {
        const element = header.querySelector(selector);
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right, width: box.width, visible: getComputedStyle(element).display !== "none" && box.width > 0 };
      };
      return { brand: rect(".brand-wordmark-name"), name: rect(".reference-document-name"), actions: rect(".reference-header-actions"), pageWidth: document.documentElement.scrollWidth, viewport: innerWidth };
    });
    expect(layout.name.visible, `filename visible at ${width}px`).toBe(true);
    expect(layout.brand.right, `brand clears filename at ${width}px`).toBeLessThanOrEqual(layout.name.left - 2);
    expect(layout.name.right, `filename clears actions at ${width}px`).toBeLessThanOrEqual(layout.actions.left);
    expect(layout.actions.right).toBeLessThanOrEqual(width);
    expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewport + 1);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".reference-file-header").getByRole("button", { name: "Print", exact: true })).toBeVisible();
  const renamed = "Renamed synthetic review.pdf";
  page.once("dialog", (dialog) => dialog.accept(renamed));
  await page.locator(".reference-document-name").click();
  await expect(page.locator(".reference-document-name")).toHaveText(renamed);
  await expect(page.locator(".reference-save-state")).toContainText("Saved in this browser");
  await page.reload();
  await expect(page.locator(".reference-document-name")).toHaveText(renamed);
  await expect(page.getByRole("img", { name: "PDF page 1", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add Text", exact: true }).click();
  const firstPage = page.locator(".page-surface").first();
  await firstPage.click({ position: { x: 90, y: 170 } });
  const input = firstPage.locator('.text-content[contenteditable="plaintext-only"]').last();
  await expect(input).toBeFocused();
  await input.fill("SYNTHETIC MOBILE EDIT");
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("Renamed synthetic review-edited.pdf");
  await download.saveAs(testInfo.outputPath("edited-header-regression.pdf"));
  const task = pdfjs.getDocument({ data: new Uint8Array(await readFile(await download.path())), verbosity: 0 });
  try {
    const document = await task.promise;
    expect(document.numPages).toBe(2);
    const text = (await (await document.getPage(1)).getTextContent()).items.map((item) => item.str).join(" ");
    expect(text).toContain("SYNTHETIC MOBILE EDIT");
    expect(text).toContain("Browser PDF benchmark");
    expect((await (await document.getPage(2)).getTextContent()).items.map((item) => item.str).join(" ")).toContain("Verification checklist");
  } finally {
    await task.destroy();
  }
});

test("share and signing headers retain document identity with their extra action", async ({ page }, testInfo) => {
  for (const route of ["/share-pdf", "/request-signatures"]) {
    await page.goto(route);
    await page.locator('input[type="file"]').first().setInputFiles({ name: "Short.pdf", mimeType: "application/pdf", buffer: fixture });
    await expect(page.getByRole("img", { name: "PDF page 1", exact: true })).toBeVisible();
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 900 });
      const brand = await page.locator(".reference-file-header .brand-wordmark-name").boundingBox();
      const name = await page.locator(".reference-document-name").boundingBox();
      const actions = await page.locator(".reference-header-actions").boundingBox();
      expect(name?.width).toBeGreaterThan(20);
      expect(brand.x + brand.width).toBeLessThanOrEqual(name.x - 2);
      expect(name.x + name.width).toBeLessThanOrEqual(actions.x);
      expect(actions.x + actions.width).toBeLessThanOrEqual(width);
      await expect(page.getByRole("button", { name: route === "/share-pdf" ? "Share PDF" : "Request signature", exact: true })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`${route.slice(1)}-${width}.png`) });
    }
  }
});

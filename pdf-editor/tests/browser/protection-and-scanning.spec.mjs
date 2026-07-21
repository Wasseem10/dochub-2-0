import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;
const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

async function samplePdf() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage([300, 400]).drawText("Flatten this form-like page", { x: 30, y: 330, size: 18, font });
  return Buffer.from(await pdf.save());
}

test("scan images become an ordered PDF download", async ({ page }) => {
  await page.goto(appPath("/scan-to-pdf"));
  await page.locator('input[type="file"]').setInputFiles([
    { name: "page-1.png", mimeType: "image/png", buffer: tinyPng },
    { name: "page-2.png", mimeType: "image/png", buffer: tinyPng },
  ]);
  await expect(page.getByText("2 pages ready")).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Create and download PDF" }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("scanned-pages.pdf");
  const output = await PDFDocument.load(await readFile(await download.path()));
  expect(output.getPageCount()).toBe(2);
});

test("flatten rebuilds pages into a downloadable PDF", async ({ page }) => {
  await page.goto(appPath("/flatten-pdf"));
  await page.locator('input[type="file"]').setInputFiles({ name: "interactive.pdf", mimeType: "application/pdf", buffer: await samplePdf() });
  await expect(page.getByText(/ready to flatten/)).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Flatten and download PDF" }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("interactive-flattened.pdf");
  const output = await PDFDocument.load(await readFile(await download.path()));
  expect(output.getPageCount()).toBe(1);
  expect(output.getForm().getFields()).toHaveLength(0);
});

test("authorized password removal runs through qpdf in the browser", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "The qpdf WASM workflow runs once in Chromium.");
  test.setTimeout(90_000);
  await page.goto(appPath("/unlock-pdf"));
  await page.locator('input[type="file"]').setInputFiles({ name: "document.pdf", mimeType: "application/pdf", buffer: await samplePdf() });
  await page.getByLabel("Open password").fill("known-password");
  await page.getByLabel(/I own this PDF/).check();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Unlock and download PDF" }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("document-unlocked.pdf");
  expect((await PDFDocument.load(await readFile(await download.path()))).getPageCount()).toBe(1);
});

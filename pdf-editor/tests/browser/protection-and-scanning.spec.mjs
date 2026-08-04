import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;
async function scanFixture(page, label) {
  return Buffer.from(await page.evaluate(async (pageLabel) => {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 700;
    const context = canvas.getContext("2d");
    context.fillStyle = "#6b7280";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.beginPath();
    context.moveTo(155, 75);
    context.lineTo(740, 105);
    context.lineTo(700, 625);
    context.lineTo(115, 585);
    context.closePath();
    context.fillStyle = "#fff";
    context.fill();
    context.save();
    context.translate(205, 155);
    context.rotate(0.025);
    context.fillStyle = "#17213b";
    context.font = "bold 38px Arial";
    context.fillText(`PDFEnrich ${pageLabel}`, 0, 0);
    context.fillStyle = "#2851eb";
    context.fillRect(0, 32, 430, 7);
    context.fillStyle = "#17213b";
    context.font = "24px Arial";
    context.fillText("Perspective correction test", 0, 96);
    context.fillText("Invoice total: $125.00", 0, 148);
    context.strokeStyle = "#ff7058";
    context.lineWidth = 5;
    context.strokeRect(0, 195, 390, 120);
    context.restore();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    return [...new Uint8Array(await blob.arrayBuffer())];
  }, label));
}

async function samplePdf() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage([300, 400]).drawText("Flatten this form-like page", { x: 30, y: 330, size: 18, font });
  return Buffer.from(await pdf.save());
}

test("scan images are corner-corrected, filtered, ordered, and exported on standard PDF pages", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "The OpenCV scanner pipeline is exercised once in Chromium.");
  test.setTimeout(120_000);
  await page.goto(appPath("/scan-to-pdf"));
  const input = page.locator('input[type="file"][multiple]');
  await input.setInputFiles({ name: "page-1.png", mimeType: "image/png", buffer: await scanFixture(page, "PAGE ONE") });
  await expect(page.getByRole("heading", { name: "Place each handle on the paper corner." })).toBeVisible({ timeout: 40_000 });
  await expect(page.locator('circle[role="slider"]')).toHaveCount(4);
  await page.getByRole("button", { name: "Confirm crop & deskew" }).click();
  await expect(page.getByText("1 / 30 ready")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Grayscale" }).click();
  await expect(page.getByRole("button", { name: "Grayscale" })).toHaveClass(/is-active/);

  await input.setInputFiles({ name: "page-2.png", mimeType: "image/png", buffer: await scanFixture(page, "PAGE TWO") });
  await expect(page.getByRole("heading", { name: "Place each handle on the paper corner." })).toBeVisible();
  await page.getByRole("button", { name: "Confirm crop & deskew" }).click();
  await expect(page.getByText("2 / 30 ready")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Move page 2 up" }).click();
  await page.getByRole("button", { name: "Rotate page 1" }).click();

  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Create and download PDF" }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("scanned-pages.pdf");
  const savedOutput = testInfo.outputPath("scanner-e2e.pdf");
  await download.saveAs(savedOutput);
  const output = await PDFDocument.load(await readFile(savedOutput));
  expect(output.getPageCount()).toBe(2);
  for (const outputPage of output.getPages()) {
    const { width, height } = outputPage.getSize();
    expect([width, height].sort((a, b) => a - b)).toEqual([612, 792]);
  }
});

test("scanner keeps its camera, counter, and photo upload reachable on phones", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "android-chromium", "Phone layout is checked once on Android Chrome.");
  await page.goto(appPath("/pdf-scanner"));
  await expect(page.getByRole("button", { name: "Start camera" })).toBeVisible();
  await expect(page.getByText("Page 1 / 30")).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose page images" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
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

test("authorized password removal runs through qpdf in the browser", async ({ page }) => {
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

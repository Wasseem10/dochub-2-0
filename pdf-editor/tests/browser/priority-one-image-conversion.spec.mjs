import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;
const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

async function jpegFixture(page) {
  const bytes = await page.evaluate(async (pngBytes) => {
    const image = new Image();
    const ready = new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
    image.src = URL.createObjectURL(new Blob([new Uint8Array(pngBytes)], { type: "image/png" }));
    await ready;
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 4;
    const context = canvas.getContext("2d");
    context.fillStyle = "#0ea5e9";
    context.fillRect(0, 0, 4, 4);
    context.drawImage(image, 1, 1, 2, 2);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    return [...new Uint8Array(await blob.arrayBuffer())];
  }, [...tinyPng]);
  return Buffer.from(bytes);
}

async function samplePdf() {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  document.addPage([300, 420]).drawText("IMAGE EXPORT 42000", { x: 30, y: 350, size: 18, font });
  return Buffer.from(await document.save());
}

async function downloadFrom(page, buttonName) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: buttonName }).click();
  const download = await pending;
  return { download, bytes: await readFile(await download.path()) };
}

test("JPG and PNG create valid native PDF pages", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Binary image output is validated once in Chromium.");
  await page.goto(appPath("/jpg-to-pdf"));
  await page.locator('input[type="file"]').setInputFiles({ name: "photo.jpg", mimeType: "image/jpeg", buffer: await jpegFixture(page) });
  await expect(page.getByText("1 image ready")).toBeVisible();
  const jpgPdf = await downloadFrom(page, "Download PDF");
  expect(jpgPdf.download.suggestedFilename()).toBe("jpg-images.pdf");
  expect((await PDFDocument.load(jpgPdf.bytes)).getPageCount()).toBe(1);

  await page.goto(appPath("/png-to-pdf"));
  await page.locator('input[type="file"]').setInputFiles({ name: "graphic.png", mimeType: "image/png", buffer: tinyPng });
  await expect(page.getByText("1 image ready")).toBeVisible();
  const pngPdf = await downloadFrom(page, "Download PDF");
  expect(pngPdf.download.suggestedFilename()).toBe("png-images.pdf");
  expect((await PDFDocument.load(pngPdf.bytes)).getPageCount()).toBe(1);
});

test("PDF pages download as genuine JPG and PNG images", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Binary image output is validated once in Chromium.");
  const source = await samplePdf();
  await page.goto(appPath("/pdf-to-jpg"));
  await page.locator('input[type="file"]').setInputFiles({ name: "source.pdf", mimeType: "application/pdf", buffer: source });
  await expect(page.getByText("1 page ·", { exact: false })).toBeVisible();
  const jpg = await downloadFrom(page, "Download JPG");
  expect(jpg.download.suggestedFilename()).toBe("source-page-001.jpg");
  expect([...jpg.bytes.subarray(0, 2)]).toEqual([0xff, 0xd8]);

  await page.goto(appPath("/pdf-to-png"));
  await page.locator('input[type="file"]').setInputFiles({ name: "source.pdf", mimeType: "application/pdf", buffer: source });
  await expect(page.getByText("1 page ·", { exact: false })).toBeVisible();
  const png = await downloadFrom(page, "Download PNG");
  expect(png.download.suggestedFilename()).toBe("source-page-001.png");
  expect([...png.bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
});

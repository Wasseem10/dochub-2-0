import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;

async function largeEditorPdf(pageCount = 120) {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Large native editor fixture");
  pdf.setSubject("Progressive rendering and native export fidelity");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < pageCount; index += 1) {
    const page = pdf.addPage([612, 792]);
    page.drawText(`Large document page ${index + 1}`, { x: 64, y: 700, size: 16, font });
  }
  const form = pdf.getForm();
  const field = form.createTextField("native.reference");
  field.setText("Preserve this form field");
  field.addToPage(pdf.getPage(0), { x: 64, y: 640, width: 220, height: 24, font });
  return Buffer.from(await pdf.save());
}

test("opens large PDFs progressively and preserves the native document on export", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("android") || testInfo.project.name.includes("iphone"), "Large-document export fidelity runs on desktop engines.");
  const source = await largeEditorPdf();
  await page.goto(appPath("/edit-pdf"));
  await page.locator('input[type="file"]').first().setInputFiles({ name: "large-native.pdf", mimeType: "application/pdf", buffer: source });

  await expect(page.locator(".page-thumbnail-item")).toHaveCount(120);
  await expect(page.locator('.page-surface img[alt="PDF page 1"]')).toBeVisible();
  expect(await page.locator(".thumb-page img").count()).toBeLessThan(10);

  await page.getByRole("button", { name: /Page 120\./ }).click();
  await expect(page.locator('.page-surface img[alt="PDF page 120"]')).toBeVisible();
  await expect(page.getByLabel("Current page")).toHaveValue("120");

  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const download = await pending;
  const exported = await PDFDocument.load(await readFile(await download.path()));
  expect(exported.getPageCount()).toBe(120);
  expect(exported.getTitle()).toBe("Large native editor fixture");
  expect(exported.getSubject()).toBe("Progressive rendering and native export fidelity");
  expect(exported.getForm().getTextField("native.reference").getText()).toBe("Preserve this form field");
});

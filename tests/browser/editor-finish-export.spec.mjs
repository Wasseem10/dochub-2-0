import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { unzipSync } from "fflate";
import { PDFDocument, StandardFonts } from "pdf-lib";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;

async function resumeFixture() {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const page = document.addPage([612, 792]);
  page.drawText("WASSEEM RESUME", { x: 72, y: 710, size: 22, font });
  page.drawText("Experience 2026", { x: 72, y: 670, size: 14, font });
  return Buffer.from(await document.save());
}

async function openFinishDialog(page) {
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Your document is ready" })).toBeVisible();
}

async function chooseAndDownload(page, format) {
  await openFinishDialog(page);
  if (format !== "PDF") {
    await page.getByRole("radio", { name: new RegExp(`\\b${format}\\b`, "i") }).click();
  }
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: `Download ${format}`, exact: true }).click();
  const download = await pending;
  await expect(page.getByRole("dialog", { name: "Your document is ready" })).toBeHidden();
  return { download, bytes: await readFile(await download.path()) };
}

test("Finish creates genuine PDF, PNG, JPG, DOCX, XLSX, and PPTX downloads", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(testInfo.project.name !== "desktop-chromium", "Binary Finish outputs are validated once in Chromium.");

  await page.goto(appPath("/edit-pdf"));
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "Resume_Wasseem.pdf",
    mimeType: "application/pdf",
    buffer: await resumeFixture(),
  });
  await expect(page.getByRole("button", { name: "Finish", exact: true })).toBeVisible();

  const pdf = await chooseAndDownload(page, "PDF");
  expect(pdf.download.suggestedFilename()).toBe("Resume_Wasseem-edited.pdf");
  expect(Buffer.from(pdf.bytes.subarray(0, 5)).toString()).toBe("%PDF-");
  expect((await PDFDocument.load(pdf.bytes)).getPageCount()).toBe(1);

  const png = await chooseAndDownload(page, "PNG");
  expect(png.download.suggestedFilename()).toBe("Resume_Wasseem.png");
  expect([...png.bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const jpg = await chooseAndDownload(page, "JPG");
  expect(jpg.download.suggestedFilename()).toBe("Resume_Wasseem.jpg");
  expect([...jpg.bytes.subarray(0, 2)]).toEqual([0xff, 0xd8]);

  const word = await chooseAndDownload(page, "Word");
  expect(word.download.suggestedFilename()).toBe("Resume_Wasseem.docx");
  const wordFiles = unzipSync(word.bytes);
  expect(wordFiles["[Content_Types].xml"]).toBeTruthy();
  expect(wordFiles["word/document.xml"]).toBeTruthy();

  const excel = await chooseAndDownload(page, "Excel");
  expect(excel.download.suggestedFilename()).toBe("Resume_Wasseem.xlsx");
  const excelFiles = unzipSync(excel.bytes);
  expect(excelFiles["[Content_Types].xml"]).toBeTruthy();
  expect(excelFiles["xl/workbook.xml"]).toBeTruthy();

  const powerpoint = await chooseAndDownload(page, "PowerPoint");
  expect(powerpoint.download.suggestedFilename()).toBe("Resume_Wasseem.pptx");
  const powerpointFiles = unzipSync(powerpoint.bytes);
  expect(powerpointFiles["[Content_Types].xml"]).toBeTruthy();
  expect(powerpointFiles["ppt/slides/slide1.xml"]).toBeTruthy();
});

import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { PDFDocument, StandardFonts } from "pdf-lib";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;

async function samplePdf() {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const page = document.addPage([612, 792]);
  page.drawText("Quarterly revenue", { x: 60, y: 720, size: 18, font });
  page.drawText("Region", { x: 60, y: 680, size: 12, font });
  page.drawText("Amount", { x: 260, y: 680, size: 12, font });
  page.drawText("North", { x: 60, y: 650, size: 12, font });
  page.drawText("42000", { x: 260, y: 650, size: 12, font });
  return Buffer.from(await document.save());
}

async function uploadAndDownload(page, route, buttonLabel) {
  await page.goto(appPath(route));
  await page.locator('input[type="file"]').setInputFiles({
    name: "quarterly-revenue.pdf",
    mimeType: "application/pdf",
    buffer: await samplePdf(),
  });
  await expect(page.getByText("quarterly-revenue.pdf")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: buttonLabel }).click();
  const download = await downloadPromise;
  return { download, bytes: await readFile(await download.path()) };
}

test("PDF to Excel downloads a valid workbook with extracted text", async ({ page }) => {
  const { download, bytes } = await uploadAndDownload(page, "/pdf-to-excel", "Download XLSX");
  expect(download.suggestedFilename()).toBe("quarterly-revenue.xlsx");
  const files = unzipSync(bytes);
  expect(files["xl/workbook.xml"]).toBeTruthy();
  expect(strFromU8(files["xl/worksheets/sheet1.xml"])).toContain("Quarterly revenue");
  expect(strFromU8(files["xl/worksheets/sheet1.xml"])).toContain("42000");
});

test("PDF to PowerPoint downloads a valid presentation with a slide", async ({ page }) => {
  const { download, bytes } = await uploadAndDownload(page, "/pdf-to-powerpoint", "Download PPTX");
  expect(download.suggestedFilename()).toBe("quarterly-revenue.pptx");
  const files = unzipSync(bytes);
  expect(files["ppt/presentation.xml"]).toBeTruthy();
  expect(files["ppt/slides/slide1.xml"]).toBeTruthy();
  const mediaFiles = Object.keys(files).filter((name) => name.startsWith("ppt/media/") && !name.endsWith("/"));
  expect(mediaFiles.length).toBeGreaterThan(0);
  expect(strFromU8(files["ppt/slides/_rels/slide1.xml.rels"])).toContain(mediaFiles[0].replace("ppt/", "../"));
});

test("PDF to HTML downloads standalone positioned selectable text", async ({ page }) => {
  const { download, bytes } = await uploadAndDownload(page, "/pdf-to-html", "Download HTML");
  expect(download.suggestedFilename()).toBe("quarterly-revenue.html");
  const html = bytes.toString("utf8");
  expect(html).toContain("<!doctype html>");
  expect(html).toContain("Quarterly revenue");
  expect(html).toContain("<svg viewBox=");
});

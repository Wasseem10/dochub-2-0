import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import PptxGenJS from "pptxgenjs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createXlsxFromPdfPages } from "../../src/tools/structuredPdfConversion.js";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;

async function downloadConversion(page, route, file, button = "Download PDF") {
  await page.goto(appPath(route));
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(page.getByText(file.name)).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: button }).click();
  const download = await pending;
  return { download, bytes: new Uint8Array(await readFile(await download.path())) };
}

test("Excel, PowerPoint, and HTML each produce a valid PDF download", async ({ page }) => {
  const xlsx = createXlsxFromPdfPages([{ name: "Revenue", rows: [["Quarter", "Total"], ["Q1", "42000"]] }]);
  const excel = await downloadConversion(page, "/excel-to-pdf", { name: "revenue.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from(xlsx) });
  expect(excel.download.suggestedFilename()).toBe("revenue.pdf");
  expect((await PDFDocument.load(excel.bytes)).getPageCount()).toBe(1);

  const pptx = new PptxGenJS();
  pptx.addSlide().addText("Public launch", { x: 1, y: 1, w: 5, h: 1, fontSize: 28, bold: true });
  pptx.addSlide().addText("Production ready", { x: 1, y: 1, w: 5, h: 1, fontSize: 24 });
  const pptxBytes = await pptx.write({ outputType: "arraybuffer" });
  const powerpoint = await downloadConversion(page, "/powerpoint-to-pdf", { name: "launch.pptx", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", buffer: Buffer.from(pptxBytes) });
  expect(powerpoint.download.suggestedFilename()).toBe("launch.pdf");
  expect((await PDFDocument.load(powerpoint.bytes)).getPageCount()).toBe(2);

  const html = Buffer.from("<!doctype html><html><body><h1>Local invoice</h1><p>Total: $42,000</p><script>document.body.innerHTML='unsafe'</script></body></html>");
  const htmlResult = await downloadConversion(page, "/html-to-pdf", { name: "invoice.html", mimeType: "text/html", buffer: html });
  expect(htmlResult.download.suggestedFilename()).toBe("invoice.pdf");
  expect((await PDFDocument.load(htmlResult.bytes)).getPageCount()).toBe(1);
});

test("OCR recognizes a scanned page and downloads a searchable PDF", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "The full OCR model check runs once in Chromium.");
  test.setTimeout(120_000);
  const source = await PDFDocument.create();
  const font = await source.embedFont(StandardFonts.HelveticaBold);
  source.addPage([612, 792]).drawText("SCANNED INVOICE 42000", { x: 70, y: 600, size: 34, font });
  const result = await downloadConversion(page, "/ocr-pdf", { name: "scan.pdf", mimeType: "application/pdf", buffer: Buffer.from(await source.save()) }, "Run OCR and download PDF");
  expect(result.download.suggestedFilename()).toBe("scan-searchable.pdf");
  const documentProxy = await pdfjsLib.getDocument({ data: result.bytes.slice(0), disableWorker: true, verbosity: 0 }).promise;
  const text = (await (await documentProxy.getPage(1)).getTextContent()).items.map((item) => item.str).join(" ");
  expect(text).toContain("SCANNED");
  expect(text).toContain("42000");
});

import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { strFromU8, unzipSync } from "fflate";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;
const primaryExportProjects = new Set(["desktop-chromium", "android-chromium", "iphone-webkit"]);
const phoneExportProjects = new Set(["android-chromium", "iphone-webkit"]);

async function textPdf(...pageLabels) {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (const label of pageLabels) {
    const page = document.addPage([612, 792]);
    page.drawText(label, { x: 72, y: 680, size: 24, font });
  }
  return Buffer.from(await document.save());
}

async function imageHeavyPdf() {
  const document = await PDFDocument.create();
  const page = document.addPage([420, 420]);
  for (let y = 0; y < 70; y += 1) {
    for (let x = 0; x < 70; x += 1) {
      const seed = (x * 31 + y * 17) % 255;
      page.drawRectangle({ x: x * 6, y: y * 6, width: 6, height: 6, color: rgb(seed / 255, ((seed * 7) % 255) / 255, ((seed * 13) % 255) / 255) });
    }
  }
  return Buffer.from(await document.save({ useObjectStreams: false }));
}

async function structuredPdf() {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const page = document.addPage([612, 792]);
  page.drawText("SEARCHABLE INVOICE 42000", { x: 72, y: 700, size: 20, font });
  for (let index = 0; index < 80; index += 1) page.drawText(`Structured row ${index + 1}`, { x: 72, y: 670 - index * 7, size: 6, font });
  const field = document.getForm().createTextField("invoice.customer");
  field.setText("Acme Incorporated");
  field.addToPage(page, { x: 72, y: 80, width: 220, height: 28 });
  return Buffer.from(await document.save({ useObjectStreams: false }));
}

async function downloadBytes(page, buttonName) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: buttonName }).click();
  const download = await pending;
  return { download, bytes: new Uint8Array(await readFile(await download.path())) };
}

async function expectNoHorizontalOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

test("merge and split preserve valid native PDF pages", async ({ page }, testInfo) => {
  test.skip(!primaryExportProjects.has(testInfo.project.name), "Full download validation runs on the primary desktop and phone engines.");
  await page.goto(appPath("/merge-pdf"));
  await page.locator('input[type="file"]').setInputFiles([
    { name: "first.pdf", mimeType: "application/pdf", buffer: await textPdf("FIRST DOCUMENT") },
    { name: "second.pdf", mimeType: "application/pdf", buffer: await textPdf("SECOND PAGE", "THIRD PAGE") },
  ]);
  await expect(page.getByText("2 PDFs ready · 3 pages")).toBeVisible();
  const merged = await downloadBytes(page, "Download merged PDF");
  expect(merged.download.suggestedFilename()).toBe("merged-pdfenrich.pdf");
  expect((await PDFDocument.load(merged.bytes)).getPageCount()).toBe(3);

  await page.goto(appPath("/split-pdf"));
  await page.locator('input[type="file"]').setInputFiles({ name: "packet.pdf", mimeType: "application/pdf", buffer: await textPdf("PAGE ONE", "PAGE TWO", "PAGE THREE") });
  await expect(page.getByText("3 pages ready")).toBeVisible();
  await page.getByPlaceholder("1-3, 4-6, 7").fill("2-3");
  const split = await downloadBytes(page, "Download split files");
  expect(split.download.suggestedFilename()).toBe("packet-pages-2-3.pdf");
  const splitPdf = await PDFDocument.load(split.bytes);
  expect(splitPdf.getPageCount()).toBe(2);
  await expectNoHorizontalOverflow(page);
});

test("compression creates a smaller valid visual PDF", async ({ page }, testInfo) => {
  test.skip(!primaryExportProjects.has(testInfo.project.name), "Pixel compression output is validated on the primary desktop and phone engines.");
  test.setTimeout(90_000);
  const source = await imageHeavyPdf();
  await page.goto(appPath("/compress-pdf"));
  await page.locator('input[type="file"]').setInputFiles({ name: "image-heavy.pdf", mimeType: "application/pdf", buffer: source });
  await expect(page.getByText("1 page ready")).toBeVisible();
  await page.getByLabel("Compression level").selectOption("maximum");
  const compressed = await downloadBytes(page, "Download compressed PDF");
  expect(compressed.download.suggestedFilename()).toBe("image-heavy-compressed.pdf");
  expect(compressed.bytes.length).toBeLessThan(source.length);
  expect((await PDFDocument.load(compressed.bytes)).getPageCount()).toBe(1);
  await expectNoHorizontalOverflow(page);
});

test("balanced compression preserves searchable text and form fields", async ({ page }, testInfo) => {
  test.skip(!primaryExportProjects.has(testInfo.project.name), "Structure-preserving compression is validated on the primary desktop and phone engines.");
  test.setTimeout(90_000);
  const source = await structuredPdf();
  await page.goto(appPath("/compress-pdf"));
  await page.locator('input[type="file"]').setInputFiles({ name: "structured.pdf", mimeType: "application/pdf", buffer: source });
  await page.getByLabel("Compression level").selectOption("balanced");
  const compressed = await downloadBytes(page, "Download compressed PDF");
  expect(compressed.bytes.length).toBeLessThan(source.length);
  const parsed = await PDFDocument.load(compressed.bytes);
  expect(parsed.getForm().getFields().map((field) => field.getName())).toContain("invoice.customer");
  const rendered = await pdfjsLib.getDocument({ data: compressed.bytes.slice(0), disableWorker: true, verbosity: 0 }).promise;
  const content = await (await rendered.getPage(1)).getTextContent();
  expect(content.items.map((item) => item.str).join(" ")).toContain("SEARCHABLE INVOICE 42000");
  await expectNoHorizontalOverflow(page);
});

test("batch compression reports measured savings, previews output, and downloads a ZIP", async ({ page }, testInfo) => {
  test.skip(!primaryExportProjects.has(testInfo.project.name), "Batch compression output is validated on the primary desktop and phone engines.");
  test.setTimeout(120_000);
  const first = await imageHeavyPdf();
  const second = await imageHeavyPdf();
  await page.goto(appPath("/compress-pdf"));
  await page.locator('input[type="file"]').setInputFiles([
    { name: "photos-one.pdf", mimeType: "application/pdf", buffer: first },
    { name: "photos-two.pdf", mimeType: "application/pdf", buffer: second },
  ]);
  await expect(page.getByText("2 PDFs · 2 pages ready")).toBeVisible();
  await page.getByLabel("Compression level").selectOption("maximum");
  const batch = await downloadBytes(page, "Compress and download ZIP");
  expect(batch.download.suggestedFilename()).toBe("pdfenrich-compressed.zip");
  const files = unzipSync(batch.bytes);
  expect(Object.keys(files).sort()).toEqual([
    "photos-one-compressed.pdf",
    "photos-two-compressed.pdf",
  ]);
  await expect(page.getByRole("region", { name: "Compression results" })).toContainText("% smaller");
  await expect(page.getByRole("img", { name: "Compressed first page of photos-one.pdf" })).toBeVisible();
  const cachedBatch = await downloadBytes(page, "Download results ZIP");
  expect(cachedBatch.download.suggestedFilename()).toBe("pdfenrich-compressed.zip");
  expect(Object.keys(unzipSync(cachedBatch.bytes)).sort()).toEqual([
    "photos-one-compressed.pdf",
    "photos-two-compressed.pdf",
  ]);
  await expectNoHorizontalOverflow(page);
});

test("compression measures larger attempts and keeps the original", async ({ page }, testInfo) => {
  test.skip(!primaryExportProjects.has(testInfo.project.name), "Honest larger-output handling is validated on the primary desktop and phone engines.");
  test.setTimeout(90_000);
  const source = await textPdf("SMALL SEARCHABLE ORIGINAL");
  await page.goto(appPath("/compress-pdf"));
  await page.locator('input[type="file"]').setInputFiles({ name: "already-small.pdf", mimeType: "application/pdf", buffer: source });
  await page.getByLabel("Compression level").selectOption("maximum");
  await page.getByRole("button", { name: "Download compressed PDF" }).click();
  const results = page.getByRole("region", { name: "Compression results" });
  await expect(results).toContainText("attempted");
  await expect(results).toContainText("larger");
  await expect(results).toContainText("kept original");
  await expect(results.getByRole("button", { name: "Download" })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test("PDF to Word and Word to PDF produce valid searchable documents", async ({ page }, testInfo) => {
  test.skip(!primaryExportProjects.has(testInfo.project.name), "Office output validation runs on the primary desktop and phone engines.");
  await page.goto(appPath("/pdf-to-word"));
  await page.locator('input[type="file"]').setInputFiles({ name: "quarterly.pdf", mimeType: "application/pdf", buffer: await textPdf("QUARTERLY TOTAL 42000") });
  await expect(page.getByText("quarterly.pdf")).toBeVisible();
  const word = await downloadBytes(page, "Download DOCX");
  expect(word.download.suggestedFilename()).toBe("quarterly.docx");
  const docxFiles = unzipSync(word.bytes);
  expect(docxFiles["word/document.xml"]).toBeTruthy();
  expect(strFromU8(docxFiles["word/document.xml"])).toContain("QUARTERLY TOTAL 42000");

  await page.goto(appPath("/pdf-to-word"));
  await page.locator('input[type="file"]').setInputFiles({ name: "quarterly.pdf", mimeType: "application/pdf", buffer: await textPdf("QUARTERLY TOTAL 42000") });
  await page.getByLabel("Conversion mode").selectOption({ label: "Visual fidelity" });
  const visualWord = await downloadBytes(page, "Download DOCX");
  const visualDocxFiles = unzipSync(visualWord.bytes);
  expect(Object.keys(visualDocxFiles).some((path) => path.startsWith("word/media/"))).toBe(true);
  expect(strFromU8(visualDocxFiles["word/document.xml"])).toContain("w:drawing");

  const sourceDocx = new Document({ sections: [{ children: [new Paragraph({ children: [new TextRun({ text: "SEARCHABLE WORD REPORT 42000", bold: true })] })] }] });
  await page.goto(appPath("/word-to-pdf"));
  await page.locator('input[type="file"]').setInputFiles({ name: "report.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: await Packer.toBuffer(sourceDocx) });
  await expect(page.getByText("report.docx")).toBeVisible();
  const pdf = await downloadBytes(page, "Download PDF");
  expect(pdf.download.suggestedFilename()).toBe("report.pdf");
  expect((await PDFDocument.load(pdf.bytes)).getPageCount()).toBe(1);
  const rendered = await pdfjsLib.getDocument({ data: pdf.bytes.slice(0), disableWorker: true, verbosity: 0 }).promise;
  const content = await (await rendered.getPage(1)).getTextContent();
  expect(content.items.map((item) => item.str).join(" ")).toContain("SEARCHABLE WORD REPORT 42000");
  await expectNoHorizontalOverflow(page);
});

test("mobile delete and rotate tools expose focused controls and preserve native pages", async ({ page }, testInfo) => {
  test.skip(!phoneExportProjects.has(testInfo.project.name), "This focused workflow validates both released phone engines.");
  const source = await textPdf("KEEP PAGE ONE", "REMOVE PAGE TWO", "ROTATE PAGE THREE");

  await page.goto(appPath("/delete-pdf-pages"));
  await page.locator('input[type="file"]').setInputFiles({ name: "page-actions.pdf", mimeType: "application/pdf", buffer: source });
  await expect(page.getByRole("button", { name: "Delete page" })).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Rotate page" })).toHaveCount(0);
  await page.getByRole("button", { name: "Delete page" }).nth(1).click();
  await expect(page.getByText("2 output pages")).toBeVisible();
  const deleted = await downloadBytes(page, "Download PDF with pages removed");
  expect(deleted.download.suggestedFilename()).toBe("page-actions-pages-removed.pdf");
  const deletedPdf = await pdfjsLib.getDocument({ data: deleted.bytes.slice(0), disableWorker: true, verbosity: 0 }).promise;
  expect(deletedPdf.numPages).toBe(2);
  const deletedText = [];
  for (let pageNumber = 1; pageNumber <= deletedPdf.numPages; pageNumber += 1) {
    const content = await (await deletedPdf.getPage(pageNumber)).getTextContent();
    deletedText.push(content.items.map((item) => item.str).join(" "));
  }
  expect(deletedText).toEqual(["KEEP PAGE ONE", "ROTATE PAGE THREE"]);
  await expectNoHorizontalOverflow(page);

  await page.goto(appPath("/rotate-pdf"));
  await page.locator('input[type="file"]').setInputFiles({ name: "page-actions.pdf", mimeType: "application/pdf", buffer: source });
  await expect(page.getByRole("button", { name: "Rotate page" })).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Delete page" })).toHaveCount(0);
  await page.getByRole("button", { name: "Rotate page" }).first().click();
  await expect(page.getByText("Original 1 · 90°")).toBeVisible();
  const rotated = await downloadBytes(page, "Download rotated PDF");
  expect(rotated.download.suggestedFilename()).toBe("page-actions-rotated.pdf");
  const rotatedPdf = await PDFDocument.load(rotated.bytes);
  expect(rotatedPdf.getPageCount()).toBe(3);
  expect(rotatedPdf.getPage(0).getRotation().angle).toBe(90);
  expect(rotatedPdf.getPage(1).getRotation().angle).toBe(0);
  await expectNoHorizontalOverflow(page);
});

test("mobile page numbers, watermarks, and crops produce verifiable PDF output", async ({ page }, testInfo) => {
  test.skip(!phoneExportProjects.has(testInfo.project.name), "This focused workflow validates both released phone engines.");
  const source = await textPdf("MOBILE PAGE FINISHING");

  await page.goto(appPath("/add-page-numbers"));
  await page.locator('input[type="file"]').setInputFiles({ name: "finishing.pdf", mimeType: "application/pdf", buffer: source });
  await page.getByLabel("Start at").fill("7");
  const numbered = await downloadBytes(page, "Download numbered PDF");
  const numberedPdf = await pdfjsLib.getDocument({ data: numbered.bytes.slice(0), disableWorker: true, verbosity: 0 }).promise;
  const numberedText = await (await numberedPdf.getPage(1)).getTextContent();
  expect(numberedText.items.map((item) => item.str)).toContain("7");
  await expectNoHorizontalOverflow(page);

  await page.goto(appPath("/watermark-pdf"));
  await page.locator('input[type="file"]').first().setInputFiles({ name: "finishing.pdf", mimeType: "application/pdf", buffer: source });
  await page.getByLabel("Text", { exact: true }).fill("REVIEW COPY");
  const watermarked = await downloadBytes(page, "Download watermarked PDF");
  const watermarkedPdf = await pdfjsLib.getDocument({ data: watermarked.bytes.slice(0), disableWorker: true, verbosity: 0 }).promise;
  const watermarkedText = await (await watermarkedPdf.getPage(1)).getTextContent();
  expect(watermarkedText.items.map((item) => item.str)).toContain("REVIEW COPY");
  await expectNoHorizontalOverflow(page);

  await page.goto(appPath("/crop-pdf"));
  await page.locator('input[type="file"]').setInputFiles({ name: "finishing.pdf", mimeType: "application/pdf", buffer: source });
  await page.getByRole("button", { name: "Trim 5%" }).click();
  const cropped = await downloadBytes(page, "Download cropped PDF");
  const croppedPdf = await PDFDocument.load(cropped.bytes);
  expect(croppedPdf.getPage(0).getCropBox().width).toBeCloseTo(550.8, 1);
  expect(croppedPdf.getPage(0).getCropBox().height).toBeCloseTo(712.8, 1);
  await expectNoHorizontalOverflow(page);
});

test("signing places a signature and exports it in the PDF", async ({ page }, testInfo) => {
  test.skip(!primaryExportProjects.has(testInfo.project.name), "Signed output validation runs on the primary desktop and phone engines.");
  await page.goto(appPath("/sign-pdf"));
  await page.locator('input[type="file"]').first().setInputFiles({ name: "agreement.pdf", mimeType: "application/pdf", buffer: await textPdf("SIGN BELOW") });
  const signatureDialog = page.getByRole("dialog", { name: "Create signature" });
  await expect(signatureDialog).toBeVisible();
  await signatureDialog.getByRole("tab", { name: "Type" }).click();
  await signatureDialog.getByLabel("Name for typed signature").fill("Wasseem Dabbas");
  await signatureDialog.getByRole("button", { name: "Save signature" }).click();
  await expect(page.getByText("Signature ready. Click the page to place it.")).toBeVisible();
  const surface = page.locator(".page-surface");
  await expect(surface).toBeVisible();
  await surface.click({ position: { x: 160, y: 420 } });
  await expect(page.locator(".annotation.signature")).toContainText("Wasseem Dabbas");
  const signed = await downloadBytes(page, "Download");
  expect((await PDFDocument.load(signed.bytes)).getPageCount()).toBe(1);
  const rendered = await pdfjsLib.getDocument({ data: signed.bytes.slice(0), disableWorker: true, verbosity: 0 }).promise;
  const content = await (await rendered.getPage(1)).getTextContent();
  expect(content.items.map((item) => item.str).join(" ")).toContain("Wasseem Dabbas");
  await expectNoHorizontalOverflow(page);
});

test("password protection downloads a genuinely encrypted PDF", async ({ page }, testInfo) => {
  test.skip(!primaryExportProjects.has(testInfo.project.name), "Encryption output is validated on the primary desktop and phone engines.");
  test.setTimeout(90_000);
  await page.goto(appPath("/protect-pdf"));
  await page.locator('input[type="file"]').first().setInputFiles({ name: "private.pdf", mimeType: "application/pdf", buffer: await textPdf("PRIVATE DOCUMENT") });
  const protectDialog = page.getByRole("dialog", { name: "Protect PDF" });
  await expect(protectDialog).toBeVisible();
  await protectDialog.getByLabel("Password", { exact: true }).fill("strong-password-42000");
  await protectDialog.getByLabel("Confirm password").fill("strong-password-42000");
  const protectedResult = await downloadBytes(page, "Protect and download");
  expect(protectedResult.download.suggestedFilename()).toBe("private-protected.pdf");
  expect(new TextDecoder("latin1").decode(protectedResult.bytes)).toContain("/Encrypt");
  await expect(PDFDocument.load(protectedResult.bytes)).rejects.toThrow();
  await expectNoHorizontalOverflow(page);
});

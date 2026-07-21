import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { strFromU8, unzipSync } from "fflate";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;

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

async function downloadBytes(page, buttonName) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: buttonName }).click();
  const download = await pending;
  return { download, bytes: new Uint8Array(await readFile(await download.path())) };
}

test("merge and split preserve valid native PDF pages", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("android") || testInfo.project.name.includes("iphone"), "Full download validation runs on desktop engines.");
  await page.goto(appPath("/merge-pdf"));
  await page.locator('input[type="file"]').setInputFiles([
    { name: "first.pdf", mimeType: "application/pdf", buffer: await textPdf("FIRST DOCUMENT") },
    { name: "second.pdf", mimeType: "application/pdf", buffer: await textPdf("SECOND PAGE", "THIRD PAGE") },
  ]);
  await expect(page.getByText("2 PDFs ready · 3 pages")).toBeVisible();
  const merged = await downloadBytes(page, "Download merged PDF");
  expect(merged.download.suggestedFilename()).toBe("merged-realpdf.pdf");
  expect((await PDFDocument.load(merged.bytes)).getPageCount()).toBe(3);

  await page.goto(appPath("/split-pdf"));
  await page.locator('input[type="file"]').setInputFiles({ name: "packet.pdf", mimeType: "application/pdf", buffer: await textPdf("PAGE ONE", "PAGE TWO", "PAGE THREE") });
  await expect(page.getByText("3 pages ready")).toBeVisible();
  await page.getByPlaceholder("1-3, 4-6, 7").fill("2-3");
  const split = await downloadBytes(page, "Download split files");
  expect(split.download.suggestedFilename()).toBe("packet-pages-2-3.pdf");
  const splitPdf = await PDFDocument.load(split.bytes);
  expect(splitPdf.getPageCount()).toBe(2);
});

test("compression creates a smaller valid visual PDF", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Pixel compression output is validated once in Chromium.");
  test.setTimeout(90_000);
  const source = await imageHeavyPdf();
  await page.goto(appPath("/compress-pdf"));
  await page.locator('input[type="file"]').setInputFiles({ name: "image-heavy.pdf", mimeType: "application/pdf", buffer: source });
  await expect(page.getByText("1 page ready")).toBeVisible();
  await page.getByLabel("Compression level").selectOption("strong");
  const compressed = await downloadBytes(page, "Download compressed PDF");
  expect(compressed.download.suggestedFilename()).toBe("image-heavy-compressed.pdf");
  expect(compressed.bytes.length).toBeLessThan(source.length);
  expect((await PDFDocument.load(compressed.bytes)).getPageCount()).toBe(1);
});

test("PDF to Word and Word to PDF produce valid searchable documents", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("android") || testInfo.project.name.includes("iphone"), "Office output validation runs on desktop engines.");
  await page.goto(appPath("/pdf-to-word"));
  await page.locator('input[type="file"]').setInputFiles({ name: "quarterly.pdf", mimeType: "application/pdf", buffer: await textPdf("QUARTERLY TOTAL 42000") });
  await expect(page.getByText("quarterly.pdf")).toBeVisible();
  const word = await downloadBytes(page, "Download DOCX");
  expect(word.download.suggestedFilename()).toBe("quarterly.docx");
  const docxFiles = unzipSync(word.bytes);
  expect(docxFiles["word/document.xml"]).toBeTruthy();
  expect(strFromU8(docxFiles["word/document.xml"])).toContain("QUARTERLY TOTAL 42000");

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
});

test("signing places a signature and exports it in the PDF", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("android") || testInfo.project.name.includes("iphone"), "Signed output validation runs on desktop engines.");
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
});

test("password protection downloads a genuinely encrypted PDF", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Encryption output is validated once in Chromium.");
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
});

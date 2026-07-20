import { expect, test } from "@playwright/test";
import { degrees, PDFDocument, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

async function regressionPdf() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const first = pdf.addPage([612, 792]);
  first.drawText("CONFIDENTIAL ACCOUNT 4172", { x: 72, y: 650, size: 22, font: bold });
  first.drawText("Selectable text, vectors, links, and metadata must not survive redaction.", { x: 72, y: 610, size: 11, font });
  first.setTitle?.("Confidential fixture");
  const landscape = pdf.addPage([792, 612]);
  landscape.drawText("LANDSCAPE REGRESSION PAGE", { x: 72, y: 510, size: 18, font: bold });
  const rotated = pdf.addPage([612, 792]);
  rotated.setRotation(degrees(90));
  rotated.drawText("ROTATED REGRESSION PAGE", { x: 72, y: 650, size: 18, font: bold });
  const form = pdf.getForm();
  const field = form.createTextField("customer.secret");
  field.setText("Hidden form value");
  field.addToPage(first, { x: 72, y: 520, width: 240, height: 28, font });
  return pdf.save();
}

test("public-beta routes render without horizontal overflow", async ({ page }) => {
  for (const route of ["/", "/tools", "/redact-pdf", "/privacy", "/terms", "/data-retention", "/support"]) {
    await page.goto(route);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("h1").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  }
});

test("real PDF matrix loads mixed page sizes, rotation, text, and forms", async ({ page }) => {
  const bytes = await regressionPdf();
  await page.goto("/redact-pdf");
  await page.locator('input[type="file"]').first().setInputFiles({ name: "regression-matrix.pdf", mimeType: "application/pdf", buffer: Buffer.from(bytes) });
  await expect(page.getByText("3 pages")).toBeVisible();
  await expect(page.locator(".redact-sidebar li")).toHaveCount(3);
  await expect(page.locator(".redact-canvas-wrap canvas")).toBeVisible();
  await page.getByRole("button", { name: /Page 2/ }).click();
  await expect(page.getByText("Page 2 of 3")).toBeVisible();
  await page.getByRole("button", { name: /Page 3/ }).click();
  await expect(page.getByText("Page 3 of 3")).toBeVisible();
});

test("permanent redaction output contains no recoverable source text or form fields", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("android") || testInfo.project.name.includes("iphone"), "Full export security verification runs on desktop browser engines.");
  const bytes = await regressionPdf();
  await page.goto("/redact-pdf");
  await page.locator('input[type="file"]').first().setInputFiles({ name: "confidential.pdf", mimeType: "application/pdf", buffer: Buffer.from(bytes) });
  const canvas = page.locator(".redact-canvas-wrap");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * 0.08, box.y + box.height * 0.13);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.22);
  await page.mouse.up();
  await expect(page.getByText(/1 permanent redaction mark/)).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Apply and download/ }).click();
  const download = await downloadPromise;
  const path = await download.path();
  const outputBytes = new Uint8Array(await import("node:fs/promises").then(({ readFile }) => readFile(path)));
  const reopened = await PDFDocument.load(outputBytes);
  expect(reopened.getPageCount()).toBe(3);
  expect(reopened.getForm().getFields()).toHaveLength(0);
  expect(reopened.getTitle()).toBe("Redacted document");
  const rendered = await pdfjsLib.getDocument({ data: outputBytes.slice(0), disableWorker: true, verbosity: 0 }).promise;
  const extracted = [];
  for (let pageNumber = 1; pageNumber <= rendered.numPages; pageNumber += 1) {
    const content = await (await rendered.getPage(pageNumber)).getTextContent();
    extracted.push(...content.items.map((item) => item.str));
  }
  expect(extracted.join(" ")).toBe("");
  const raw = new TextDecoder("latin1").decode(outputBytes);
  expect(raw).not.toContain("CONFIDENTIAL ACCOUNT 4172");
  expect(raw).not.toContain("Hidden form value");
});

import { expect, test } from "@playwright/test";
import { degrees, PDFDocument, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;

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
  for (const route of [
    "/", "/tools", "/edit-pdf", "/merge-pdf", "/split-pdf", "/compress-pdf", "/pdf-to-word", "/word-to-pdf",
    "/ocr-pdf", "/sign-pdf", "/protect-pdf", "/compare-pdf", "/redact-pdf", "/privacy", "/terms", "/data-retention", "/support",
  ]) {
    await page.goto(appPath(route));
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("h1").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  }
});

test("landing Tools menu exposes every released FixThatPDF workflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("android") || testInfo.project.name.includes("iphone"), "Desktop mega-menu is replaced by the compact mobile navigation.");
  await page.goto(appPath("/"));
  const toolsButton = page.getByRole("button", { name: "Tools", exact: true });
  await expect(toolsButton).toBeVisible();
  await expect(toolsButton.locator("svg").first()).toBeVisible();
  await toolsButton.click();

  const menu = page.getByRole("region", { name: "FixThatPDF tools" });
  await expect(menu).toBeVisible();
  await expect(menu.locator(".freepdf-tool-menu-link")).toHaveCount(68);
  await expect(menu.getByRole("heading", { name: "Edit and view", exact: true })).toBeVisible();
  await expect(menu.getByRole("heading", { name: "Convert from PDF", exact: true })).toBeVisible();
  await expect(menu.getByRole("heading", { name: "Convert to PDF", exact: true })).toBeVisible();
  await expect(menu.getByRole("heading", { name: "OCR and scan", exact: true })).toBeVisible();
  await expect(menu.getByRole("link", { name: "PDF to Excel", exact: true })).toHaveAttribute("href", /\/pdf-to-excel$/);

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(toolsButton).toBeFocused();
});

test("the lightweight homepage hands a selected PDF to the full editor", async ({ page }) => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const firstPage = pdf.addPage([612, 792]);
  firstPage.drawText("LANDING HANDOFF", { x: 72, y: 650, size: 18, font });

  await page.goto(appPath("/"));
  await page.locator('input[type="file"]').first().setInputFiles({ name: "landing-handoff.pdf", mimeType: "application/pdf", buffer: Buffer.from(await pdf.save()) });

  await expect(page).toHaveURL(/\/edit-pdf\?tool=edit-pdf&document=/);
  await expect(page.locator(".detected-text-item").first()).toContainText("LANDING HANDOFF");
  await expect(page.getByRole("button", { name: "Download", exact: true })).toBeVisible();
});

test("tool guides stay centered and readable on wide screens", async ({ page }) => {
  const routes = ["/pdf-to-word", "/pdf-to-excel", "/excel-to-pdf", "/ocr-pdf", "/merge-pdf"];

  await page.setViewportSize({ width: 2048, height: 1152 });
  for (const route of routes) {
    await page.goto(appPath(route));
    const guide = page.locator(".tool-guide-content");
    await expect(guide).toBeVisible();
    const layout = await guide.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        width: rect.width,
        left: rect.left,
        rightGap: window.innerWidth - rect.right,
      };
    });
    expect(layout.width).toBeLessThanOrEqual(1180.5);
    expect(Math.abs(layout.left - layout.rightGap)).toBeLessThanOrEqual(1);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of routes) {
    await page.goto(appPath(route));
    const guide = page.locator(".tool-guide-content");
    await expect(guide).toBeVisible();
    const layout = await guide.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const firstCard = element.querySelector(".tool-guide-grid > article");
      const cardRect = firstCard?.getBoundingClientRect();
      return {
        width: rect.width,
        left: rect.left,
        rightGap: window.innerWidth - rect.right,
        cardWidth: cardRect?.width ?? 0,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(layout.width).toBeLessThanOrEqual(360.5);
    expect(Math.abs(layout.left - layout.rightGap)).toBeLessThanOrEqual(1);
    expect(layout.cardWidth).toBeLessThanOrEqual(layout.width);
    expect(layout.scrollWidth).toBeLessThanOrEqual(390);
  }
});

test("real PDF matrix loads mixed page sizes, rotation, text, and forms", async ({ page }) => {
  const bytes = await regressionPdf();
  await page.goto(appPath("/redact-pdf"));
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
  await page.goto(appPath("/redact-pdf"));
  await page.locator('input[type="file"]').first().setInputFiles({ name: "confidential.pdf", mimeType: "application/pdf", buffer: Buffer.from(bytes) });
  const canvas = page.locator(".redact-canvas-wrap");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  const start = { pointerId: 7, pointerType: "mouse", clientX: box.x + box.width * 0.08, clientY: box.y + box.height * 0.13, buttons: 1, bubbles: true };
  const end = { pointerId: 7, pointerType: "mouse", clientX: box.x + box.width * 0.72, clientY: box.y + box.height * 0.22, buttons: 1, bubbles: true };
  await canvas.dispatchEvent("pointerdown", start);
  await page.waitForTimeout(50);
  await canvas.dispatchEvent("pointermove", end);
  await page.waitForTimeout(50);
  await canvas.dispatchEvent("pointerup", { ...end, buttons: 0 });
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

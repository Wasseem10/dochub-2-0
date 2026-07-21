import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;

async function analysisPdf() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page1 = pdf.addPage([612, 792]);
  page1.drawText("Service Agreement", { x: 60, y: 700, size: 22, font });
  page1.drawText("Customer shall pay $42,000 by July 30, 2026.", { x: 60, y: 650, size: 13, font });
  page1.drawText("Contact: owner@example.com", { x: 60, y: 620, size: 13, font });
  const page2 = pdf.addPage([612, 792]);
  page2.drawText("Either party may terminate with 30 days notice.", { x: 60, y: 700, size: 13, font });
  page2.drawText("Confidential information must remain protected.", { x: 60, y: 670, size: 13, font });
  return Buffer.from(await pdf.save());
}

async function upload(page, route) {
  await page.goto(appPath(route));
  await page.locator('input[type="file"]').setInputFiles({ name: "agreement.pdf", mimeType: "application/pdf", buffer: await analysisPdf() });
  await expect(page.getByText(/2 pages/)).toBeVisible();
}

test("summarizes a PDF with page citations and downloads the report", async ({ page }) => {
  await upload(page, "/summarize-pdf");
  await page.getByRole("button", { name: "Create cited summary" }).click();
  await expect(page.getByText("Page 1", { exact: true }).first()).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download report" }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("agreement-summarize-pdf.txt");
  expect((await readFile(await download.path(), "utf8"))).toContain("[Page 1]");
});

test("answers a focused question only with matching source passages", async ({ page }) => {
  await upload(page, "/ask-pdf");
  await page.getByLabel("Question about this PDF").fill("What is the termination notice?");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByText(/30 days notice/)).toBeVisible();
  await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
});

test("uses the browser Translator model and downloads translated PDF", async ({ page }) => {
  await page.addInitScript(() => {
    globalThis.Translator = { availability: async () => "available", create: async ({ targetLanguage }) => ({ translate: async (text) => `[${targetLanguage}] ${text}`, destroy() {} }) };
  });
  await upload(page, "/translate-pdf");
  await page.getByRole("button", { name: "Translate document" }).click();
  await expect(page.getByText(/\[es\] Page 1/)).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download translated PDF" }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("agreement-translated.pdf");
  expect((await PDFDocument.load(await readFile(await download.path()))).getPageCount()).toBeGreaterThan(0);
});

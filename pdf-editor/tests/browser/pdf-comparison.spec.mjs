import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;

async function comparisonPdf(label, total) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([612, 792]);
  page.drawText("Quarterly report", { x: 64, y: 700, size: 24, font: bold });
  page.drawText(label, { x: 64, y: 650, size: 14, font });
  page.drawText(`Total: ${total}`, { x: 64, y: 620, size: 14, font });
  return Buffer.from(await pdf.save());
}

test("compares two PDFs and downloads a marked report", async ({ page }) => {
  await page.goto(appPath("/compare-pdf"));
  const inputs = page.locator('input[type="file"]');
  await inputs.nth(0).setInputFiles({ name: "original.pdf", mimeType: "application/pdf", buffer: await comparisonPdf("Draft", "42000") });
  await inputs.nth(1).setInputFiles({ name: "revised.pdf", mimeType: "application/pdf", buffer: await comparisonPdf("Approved", "48000") });
  await expect(page.getByText("Both PDFs are ready")).toBeVisible();
  await page.getByRole("button", { name: "Compare PDFs" }).click();
  await expect(page.getByRole("heading", { name: "1 of 1 pages changed" })).toBeVisible();
  await expect(page.getByText(/similar · \+/)).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download report PDF" }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("revised-comparison.pdf");
  const report = await PDFDocument.load(await readFile(await download.path()));
  expect(report.getPageCount()).toBe(1);
});

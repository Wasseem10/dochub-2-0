import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { strToU8, zipSync } from "fflate";
import { PDFDocument } from "pdf-lib";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;

async function convert(page, route, file) {
  await page.goto(appPath(route));
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(page.getByText(/ready for conversion/)).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const download = await pending;
  return { download, pdf: await PDFDocument.load(await readFile(await download.path())) };
}

test("RTF becomes a readable PDF", async ({ page }) => {
  const result = await convert(page, "/rtf-to-pdf", { name: "report.rtf", mimeType: "application/rtf", buffer: Buffer.from(String.raw`{\rtf1\ansi Quarterly report\par Total 42000}`) });
  expect(result.download.suggestedFilename()).toBe("report.pdf");
  expect(result.pdf.getPageCount()).toBe(1);
});

test("ZIP combines supported documents into one PDF", async ({ page }) => {
  const archive = zipSync({ "01-cover.txt": strToU8("Cover page"), "02-notes.rtf": strToU8(String.raw`{\rtf1 Notes page}`) });
  const result = await convert(page, "/zip-to-pdf", { name: "packet.zip", mimeType: "application/zip", buffer: Buffer.from(archive) });
  expect(result.download.suggestedFilename()).toBe("packet.pdf");
  expect(result.pdf.getPageCount()).toBe(2);
});

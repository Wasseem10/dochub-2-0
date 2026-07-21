import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;

async function downloadPdf(page) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const download = await pending;
  return { download, pdf: await PDFDocument.load(await readFile(await download.path())) };
}

test("invoice builder recalculates line items and downloads a real PDF", async ({ page }) => {
  await page.goto(appPath("/invoice-templates"));
  await expect(page.getByText("Live PDF preview")).toBeVisible();
  await page.getByLabel("Business name").fill("Acme Design Co.");
  await page.getByLabel("Bill to").fill("Example Customer");
  await page.getByLabel("Tax rate (%)").fill("10");
  await page.getByLabel("Quantity").first().fill("2");
  await page.getByLabel("Rate", { exact: true }).first().fill("100");
  await expect(page.getByText("$484.00", { exact: true }).last()).toBeVisible();
  const { download, pdf } = await downloadPdf(page);
  expect(download.suggestedFilename()).toBe("invoice.pdf");
  expect(pdf.getPageCount()).toBeGreaterThan(0);
  expect(pdf.getAuthor()).toBe("Acme Design Co.");
});

test("NDA builder keeps edits in its live preview and exports a review draft", async ({ page }) => {
  await page.goto(appPath("/nda-templates"));
  await page.getByLabel("Agreement type").selectOption("One-way");
  await page.getByLabel("Disclosing party").fill("Bluebird Labs LLC");
  await expect(page.getByText("One-way Nondisclosure Agreement")).toBeVisible();
  await expect(page.getByText(/not legal advice/i).first()).toBeVisible();
  const { download, pdf } = await downloadPdf(page);
  expect(download.suggestedFilename()).toBe("nda.pdf");
  expect(pdf.getPageCount()).toBeGreaterThan(0);
});

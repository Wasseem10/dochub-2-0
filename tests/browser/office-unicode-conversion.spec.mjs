import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import PptxGenJS from "pptxgenjs";
import { createXlsxFromPdfPages } from "../../src/tools/structuredPdfConversion.js";
import { formattedValues, formattedXlsx } from "../fixtures/xlsx-number-formats.mjs";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;
const config = JSON.parse(await readFile(new URL("../../vercel.json", import.meta.url), "utf8"));
const headers = Object.fromEntries(config.headers[0].headers.map(({ key, value }) => [key.toLowerCase(), value]));
headers["content-security-policy"] = headers["content-security-policy"].replace(/;\s*upgrade-insecure-requests/, "");

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() !== "document") return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), ...headers } });
  });
});

function spreadsheet(rows = [["Nom", "Prix"], ["Café", "Coût: € 42"], ["François", "Total: £ 15"], ["“Été”—œuvre…", "Straße"]]) {
  return {
    name: "Résumé.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(createXlsxFromPdfPages([{ name: "Résumé", rows }])),
  };
}

async function slides(text = "Résumé — Café € 42") {
  const pptx = new PptxGenJS();
  pptx.addSlide().addText(text, { x: 1, y: 1, w: 8, h: 1, fontSize: 24, bold: true });
  pptx.addSlide().addText("François — £ 15", { x: 1, y: 1, w: 8, h: 1, fontSize: 22 });
  return {
    name: "Présentation.pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    buffer: Buffer.from(await pptx.write({ outputType: "arraybuffer" })),
  };
}

async function checkPdf(bytes, pageCount, expected) {
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0 });
  try {
    const document = await task.promise;
    expect(document.numPages).toBe(pageCount);
    const text = [];
    for (let number = 1; number <= document.numPages; number += 1) {
      text.push((await (await document.getPage(number)).getTextContent()).items.map((item) => item.str).join(" "));
    }
    for (const value of expected) expect(text.join("\n")).toContain(value);
  } finally {
    await task.destroy();
  }
}

test("Office tool downloads preserve supported Unicode and render every output page", async ({ page }, testInfo) => {
  const fixtures = [
    { route: "/excel-to-pdf", kind: "xlsx", file: spreadsheet(), pages: 1, expected: ["Résumé", "Café", "€ 42", "François", "£ 15", "“Été”—œuvre…", "Straße"] },
    { route: "/powerpoint-to-pdf", kind: "pptx", file: await slides(), pages: 2, expected: ["Résumé — Café € 42", "François — £ 15"] },
  ];
  for (const fixture of fixtures) {
    await page.goto(appPath(fixture.route));
    await page.locator('input[type="file"]').setInputFiles(fixture.file);
    const action = page.getByRole("button", { name: "Download PDF", exact: true });
    await expect(action).toBeEnabled();
    const pending = page.waitForEvent("download");
    await action.click();
    const downloaded = await pending;
    expect(downloaded.suggestedFilename()).toBe(fixture.file.name.replace(/\.[^.]+$/, ".pdf"));
    await downloaded.saveAs(testInfo.outputPath(`${fixture.kind}-unicode.pdf`));
    const bytes = await readFile(await downloaded.path());
    await checkPdf(bytes, fixture.pages, fixture.expected);
    expect((await PDFDocument.load(bytes)).getTitle()).toBe(fixture.file.name.replace(/\.[^.]+$/, ""));

    await page.goto(appPath("/edit-pdf"));
    await page.locator('input[type="file"]').first().setInputFiles({ name: downloaded.suggestedFilename(), mimeType: "application/pdf", buffer: bytes });
    await expect(page.getByRole("img", { name: "PDF page 1", exact: true })).toBeVisible();
    for (let number = 1; number <= fixture.pages; number += 1) {
      await page.getByRole("img", { name: `PDF page ${number}`, exact: true }).scrollIntoViewIfNeeded();
      await expect(page.getByRole("img", { name: `PDF page ${number}`, exact: true })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`${fixture.kind}-unicode-page-${number}.png`) });
    }
  }
});

test("homepage Office upload and editor export retain supported Unicode", async ({ page }) => {
  await page.goto(appPath("/"));
  await page.locator(".freepdf-page > input[type='file']").setInputFiles(spreadsheet());
  await expect(page).toHaveURL(/\/edit-pdf\?[^#]*document=/);
  await expect(page.getByRole("img", { name: "PDF page 1", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  await checkPdf(await readFile(await (await pending).path()), 1, ["Café", "€ 42", "François", "£ 15", "“Été”—œuvre…"]);
});

test("unsupported Office text reports an error without releasing a substituted PDF", async ({ page }) => {
  const downloaded = [];
  page.on("download", (download) => downloaded.push(download));
  for (const [route, file] of [["/excel-to-pdf", spreadsheet([["東京"]])], ["/powerpoint-to-pdf", await slides("東京")]]) {
    await page.goto(appPath(route));
    await page.locator('input[type="file"]').setInputFiles(file);
    const action = page.getByRole("button", { name: "Download PDF", exact: true });
    await expect(action).toBeEnabled();
    await action.click();
    await expect(page.getByRole("alert")).toContainText("cannot preserve");
    await expect(page.getByRole("alert")).not.toContainText("東京");
    await expect(page.getByText("Your PDF is ready.", { exact: true })).toHaveCount(0);
    await expect(action).toBeEnabled();
  }
  expect(downloaded).toEqual([]);
});

test("Excel downloads retain dates, percentages, currency and leading zeros", async ({ page }, testInfo) => {
  for (const date1904 of [false, true]) {
    await page.goto(appPath("/excel-to-pdf"));
    await page.locator('input[type="file"]').setInputFiles({ name: "Formats.xlsx", mimeType: spreadsheet().mimeType, buffer: Buffer.from(formattedXlsx({ date1904 })) });
    const action = page.getByRole("button", { name: "Download PDF", exact: true });
    await expect(action).toBeEnabled();
    const pending = page.waitForEvent("download");
    await action.click();
    const downloaded = await pending;
    expect(downloaded.suggestedFilename()).toBe("Formats.pdf");
    await downloaded.saveAs(testInfo.outputPath(`number-formats-${date1904 ? 1904 : 1900}.pdf`));
    const bytes = await readFile(await downloaded.path());
    await checkPdf(bytes, 1, formattedValues.filter(Boolean));
    await page.goto(appPath("/edit-pdf"));
    await page.locator('input[type="file"]').first().setInputFiles({ name: "Formats.pdf", mimeType: "application/pdf", buffer: bytes });
    await expect(page.getByRole("img", { name: "PDF page 1", exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`number-formats-${date1904 ? 1904 : 1900}.png`) });
  }
});

test("homepage Excel upload and editor download retain numeric display formats", async ({ page }) => {
  await page.goto(appPath("/"));
  await page.locator(".freepdf-page > input[type='file']").setInputFiles({ name: "Formats.xlsx", mimeType: spreadsheet().mimeType, buffer: Buffer.from(formattedXlsx()) });
  await expect(page).toHaveURL(/\/edit-pdf\?[^#]*document=/);
  await expect(page.getByRole("img", { name: "PDF page 1", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  await checkPdf(await readFile(await (await pending).path()), 1, formattedValues.filter(Boolean));
});

test("invalid Excel formats stop conversion and allow a new valid upload", async ({ page }) => {
  const downloads = [];
  page.on("download", (download) => downloads.push(download));
  await page.goto(appPath("/excel-to-pdf"));
  const input = page.locator('input[type="file"]');
  await input.setInputFiles({ name: "Formats.xlsx", mimeType: spreadsheet().mimeType, buffer: Buffer.from(formattedXlsx({ currencyFormat: "invalid-private-format" })) });
  await expect(page.getByRole("alert")).toContainText("cannot preserve");
  await expect(page.getByRole("alert")).not.toContainText("invalid-private-format");
  const action = page.getByRole("button", { name: "Download PDF", exact: true });
  await expect(action).toBeDisabled();
  expect(downloads).toEqual([]);
  await input.setInputFiles({ name: "Formats.xlsx", mimeType: spreadsheet().mimeType, buffer: Buffer.from(formattedXlsx({ currency: "£" })) });
  await expect(action).toBeEnabled();
  const pending = page.waitForEvent("download");
  await action.click();
  await checkPdf(await readFile(await (await pending).path()), 1, ["2024-01-01", "£1,234.50", "(£12.50)"]);
});

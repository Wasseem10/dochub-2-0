import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

// Local previews otherwise omit the security headers that production enforces.
const config = JSON.parse(await readFile(new URL("../../vercel.json", import.meta.url), "utf8"));
const headers = Object.fromEntries(config.headers[0].headers.map(({ key, value }) => [key.toLowerCase(), value]));
// Vite's loopback preview is HTTP, unlike production. WebKit upgrades even
// loopback assets to HTTPS; omit only transport upgrading for this local test.
// All source restrictions, especially connect-src without data:, stay intact.
headers["content-security-policy"] = headers["content-security-policy"].replace(/;\s*upgrade-insecure-requests/, "");
const fixture = new URL("../../runtime-public/research/fixtures/simple-searchable.pdf", import.meta.url);

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() !== "document") return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), ...headers } });
  });
});

test("guest PDF opens and reopens with production security headers", async ({ page }, testInfo) => {
  await page.goto("/edit-pdf");
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "opening-regression.pdf", mimeType: "application/pdf", buffer: await readFile(fixture),
  });
  await expect(page.locator(".page-surface").first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("Opening was interrupted", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".page-surface").first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("Opening was interrupted", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("img", { name: "PDF page 1", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("opened-document.png") });
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  const exported = new Uint8Array(await readFile(await (await pending).path()));
  expect((await PDFDocument.load(exported)).getPageCount()).toBe((await PDFDocument.load(await readFile(fixture))).getPageCount());
});

test("local image annotations export under production security headers", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Image export is checked once alongside cross-device reopening.");
  await page.goto("/edit-pdf");
  await page.getByRole("button", { name: "Start with a blank page", exact: true }).click();
  await page.getByRole("button", { name: "Image", exact: true }).click();
  await page.locator("input.hidden-input[accept='image/png,image/jpeg']").setInputFiles({
    name: "test-mark.png", mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFElEQVR42mP4z8DwH4QZGBgYGJAAADn5Af+GmrmUAAAAAElFTkSuQmCC", "base64"),
  });
  await page.locator(".page-surface").first().click({ position: { x: 120, y: 160 } });
  await expect(page.locator(".annotation.image-annotation")).toHaveCount(1);
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  const exported = new Uint8Array(await readFile(await (await pending).path()));
  const loadingTask = pdfjs.getDocument({ data: exported, verbosity: 0 });
  const document = await loadingTask.promise;
  expect(document.numPages).toBe(1);
  const operators = await (await document.getPage(1)).getOperatorList();
  expect(operators.fnArray.some((op) => [pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintInlineImageXObject].includes(op))).toBe(true);
  await loadingTask.destroy();
});

test("homepage sends visitors directly to focused PDF workflows", async ({ page }, testInfo) => {
  await page.goto("/");
  const shortcuts = page.getByRole("navigation", { name: "Everyday PDF workflows" });
  await expect(shortcuts).toBeVisible();
  await expect(shortcuts.getByRole("link", { name: "Shrink a PDF attachment" })).toHaveAttribute("href", "/compress-pdf");
  await expect(shortcuts.getByRole("link", { name: "Combine PDFs into one file" })).toHaveAttribute("href", "/merge-pdf");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("workflow-links.png") });
  await shortcuts.getByRole("link", { name: "Shrink a PDF attachment" }).click();
  await expect(page).toHaveURL(/\/compress-pdf$/);
  await expect(page.locator('input[type="file"]')).toHaveCount(1);
});

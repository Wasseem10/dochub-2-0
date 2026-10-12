import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const fixture = await readFile(new URL("../../runtime-public/research/fixtures/simple-searchable.pdf", import.meta.url));
const config = JSON.parse(await readFile(new URL("../../vercel.json", import.meta.url), "utf8"));
const headers = Object.fromEntries(config.headers[0].headers.map(({ key, value }) => [key.toLowerCase(), value]));
headers["content-security-policy"] = headers["content-security-policy"].replace(/;\s*upgrade-insecure-requests/, "");

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() !== "document") return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), ...headers } });
  });
  await page.addInitScript(() => {
    window.syntheticCanvasFailure = "png";
    window.syntheticCanvasFailures = 0;
    const original = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (type, ...args) {
      if (this.width > 100 && this.height > 100 && (type === "image/png" || type === "image/jpeg")
        && (window.syntheticCanvasFailure === "all" || window.syntheticCanvasFailure === "png" && type === "image/png")) {
        window.syntheticCanvasFailures += 1;
        return "data:,";
      }
      return original.call(this, type, ...args);
    };
  });
});

async function upload(page) {
  await page.goto("/edit-pdf");
  await page.locator('input[type="file"]').first().setInputFiles({ name: "canvas-recovery.pdf", mimeType: "application/pdf", buffer: fixture });
  await expect(page).toHaveURL(/\/edit-pdf\?[^#]*document=/);
}

async function checkDownloadedPdf(page, testInfo) {
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  const download = await pending;
  await download.saveAs(testInfo.outputPath("recovered.pdf"));
  const task = pdfjs.getDocument({ data: new Uint8Array(await readFile(await download.path())), verbosity: 0 });
  try {
    const document = await task.promise;
    expect(document.numPages).toBe(2);
    expect((await (await document.getPage(1)).getTextContent()).items.map((item) => item.str).join(" ")).toContain("Browser PDF benchmark");
    expect((await (await document.getPage(2)).getTextContent()).items.map((item) => item.str).join(" ")).toContain("Verification checklist");
  } finally {
    await task.destroy();
  }
}

test("empty PNG serialization recovers using a readable JPEG preview", async ({ page }, testInfo) => {
  await upload(page);
  for (const number of [1, 2]) {
    const image = page.getByRole("img", { name: `PDF page ${number}`, exact: true });
    await expect(image).toHaveAttribute("src", /^data:image\/jpeg;base64,/);
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true);
  }
  await expect(page.getByRole("button", { name: "Reload page", exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("automatic-recovery.png") });
  await checkDownloadedPdf(page, testInfo);
});

test("persistent empty serialization gives a page retry and preserves the source PDF", async ({ page }, testInfo) => {
  await page.goto("/edit-pdf");
  await page.evaluate(() => { window.syntheticCanvasFailure = "all"; });
  await page.locator('input[type="file"]').first().setInputFiles({ name: "canvas-retry.pdf", mimeType: "application/pdf", buffer: fixture });
  const firstPage = page.locator('.page-surface[data-page-index="0"]');
  const retry = firstPage.getByRole("button", { name: "Reload page", exact: true });
  await expect(retry).toBeVisible();
  await expect(firstPage.getByRole("alert")).toContainText("Page 1 needs to reload");
  await expect(firstPage.locator(".pdf-image")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("page-retry.png") });
  const attempts = await page.evaluate(() => window.syntheticCanvasFailures);
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => window.syntheticCanvasFailures)).toBe(attempts);
  await page.getByRole("button", { name: "Add Text", exact: true }).click();
  await retry.click({ timeout: 10000 });
  await expect(retry).toBeVisible();
  await expect(page.locator(".annotation.text-annotation")).toHaveCount(0);
  await page.evaluate(() => { window.syntheticCanvasFailure = "none"; });
  await retry.click({ timeout: 10000 });
  const image = page.getByRole("img", { name: "PDF page 1", exact: true });
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true);
  await expect(firstPage.getByRole("alert")).toHaveCount(0);
  await page.locator(".canvas-column").evaluate((element) => { element.scrollTop = 0; });
  const viewport = page.viewportSize();
  await page.screenshot({ path: testInfo.outputPath("manual-recovery.png"), clip: { x: 0, y: 0, width: viewport.width, height: Math.min(500, viewport.height) } });
  await checkDownloadedPdf(page, testInfo);
});

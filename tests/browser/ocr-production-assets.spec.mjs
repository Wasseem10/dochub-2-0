import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const config = JSON.parse(await readFile(new URL("../../vercel.json", import.meta.url), "utf8"));
const runtimeVersion = JSON.parse(await readFile(new URL("../../node_modules/tesseract.js/package.json", import.meta.url), "utf8")).version;
const productionHeaders = Object.fromEntries(config.headers[0].headers.map(({ key, value }) => [key.toLowerCase(), value]));
const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;
// The local preview uses HTTP. Preserve every source restriction, including
// the worker's own policy, and omit only HTTPS upgrading on loopback.
productionHeaders["content-security-policy"] = productionHeaders["content-security-policy"].replace(/;\s*upgrade-insecure-requests/, "");

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Exercise the OCR engine once with production security headers.");
  await page.route("**/*", async (route) => {
    if (new URL(route.request().url()).origin !== new URL(testInfo.project.use.baseURL).origin) return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), ...productionHeaders } });
  });
});

async function uploadScan(page, { navigate = true } = {}) {
  if (navigate) await page.goto(appPath("/ocr-pdf"));
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1500;
    const context = canvas.getContext("2d");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "black";
    context.font = "bold 56px Arial";
    context.fillText("SCANNED INVOICE 42000", 90, 240);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const source = await PDFDocument.create();
  const png = await source.embedPng(Buffer.from(image, "base64"));
  source.addPage([612, 765]).drawImage(png, { x: 0, y: 0, width: 612, height: 765 });
  await page.locator('input[type="file"]').setInputFiles({
    name: "synthetic-scan.pdf", mimeType: "application/pdf", buffer: Buffer.from(await source.save()),
  });
  await expect(page.getByText("1 page ready for OCR", { exact: true })).toBeVisible();
}

test("OCR generates searchable text with production CSP and no CDN engine requests", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const externalEngineRequests = [];
  page.on("request", (request) => {
    if (/cdn\.jsdelivr\.net|tessdata\.projectnaptha\.com/.test(request.url())) externalEngineRequests.push(request.url());
  });
  await uploadScan(page);
  const downloadPromise = page.waitForEvent("download").catch(() => null);
  await page.getByRole("button", { name: "Run OCR and download PDF", exact: true }).click();
  await expect(page.locator(".ocr-quality-result")).toBeVisible({ timeout: 45_000 });
  const download = await downloadPromise;
  expect(download).not.toBeNull();
  expect(download.suggestedFilename()).toBe("synthetic-scan-searchable.pdf");
  const originalBytes = await readFile(await download.path());
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(originalBytes), verbosity: 0 });
  try {
    const document = await loadingTask.promise;
    expect(document.numPages).toBe(1);
    const text = (await (await document.getPage(1)).getTextContent()).items.map((item) => item.str).join(" ");
    expect(text).toContain("SCANNED");
    expect(text).toContain("42000");
  } finally {
    await loadingTask.destroy();
  }
  expect(externalEngineRequests).toEqual([]);
  await expect(page.getByRole("button", { name: "Download searchable PDF", exact: true })).toBeVisible();
  await expect.poll(() => page.workers().filter((worker) => worker.url().includes("/vendor/ocr/")).length).toBe(0);
  const repeatWorkers = [];
  page.on("worker", (worker) => {
    if (worker.url().includes("/vendor/ocr/")) repeatWorkers.push(worker.url());
  });
  // A completed result must remain downloadable even if the model cannot load again.
  await page.route("**/eng.traineddata.gz", (route) => route.fulfill({ status: 503, body: "Unavailable" }));
  for (const viewport of [{ width: 1280, height: 720 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole("button", { name: "Download searchable PDF", exact: true })).toHaveCSS("color", "rgb(49, 69, 127)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const repeated = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download searchable PDF", exact: true }).click();
    const copy = await repeated;
    expect(copy.suggestedFilename()).toBe(download.suggestedFilename());
    expect(await readFile(await copy.path())).toEqual(originalBytes);
    await expect(page.locator(".ocr-quality-result")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`ocr-redownload-${viewport.width}.png`) });
  }
  const textDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download recognized TXT", exact: true }).click();
  const textCopy = await textDownload;
  expect(textCopy.suggestedFilename()).toBe("synthetic-scan-ocr.txt");
  expect(await readFile(await textCopy.path(), "utf8")).toContain("SCANNED INVOICE 42000");
  expect(repeatWorkers).toEqual([]);

  // Simulate a browser download failure and verify Retry uses the retained bytes.
  await page.evaluate(() => {
    const createObjectURL = URL.createObjectURL;
    URL.createObjectURL = function (blob) {
      URL.createObjectURL = createObjectURL;
      if (blob.type === "application/pdf") throw new Error("Synthetic download failure");
      return createObjectURL.call(URL, blob);
    };
  });
  await page.getByRole("button", { name: "Download searchable PDF", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Your completed result is still available");
  const recovered = page.waitForEvent("download");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  expect(await readFile(await (await recovered).path())).toEqual(originalBytes);
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(repeatWorkers).toEqual([]);

  await page.getByRole("combobox", { name: "Scan cleanup", exact: true }).selectOption("original");
  await page.getByRole("combobox", { name: "Document language", exact: true }).selectOption("spa");
  let releaseModel;
  const modelGate = new Promise((resolve) => { releaseModel = resolve; });
  await page.route("**/spa.traineddata.gz", async (route) => {
    await modelGate;
    await route.fulfill({ status: 503, body: "Unavailable" });
  });
  await page.getByRole("button", { name: "Run OCR again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Download searchable PDF", exact: true })).toBeDisabled();
  await page.locator(".conversion-dropzone").evaluate((zone, bytes) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array(bytes)], "replacement.pdf", { type: "application/pdf" }));
    zone.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: transfer }));
  }, [...originalBytes]);
  await expect(page.locator(".office-file-card strong")).toHaveText("synthetic-scan.pdf");
  releaseModel();
  await expect(page.getByRole("alert")).toContainText("The OCR language model could not load", { timeout: 30_000 });
  const retained = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download searchable PDF", exact: true }).click();
  expect(await readFile(await (await retained).path())).toEqual(originalBytes);
  await expect(page.locator(".ocr-quality-result")).toBeVisible();
  await page.unroute("**/eng.traineddata.gz");
  await uploadScan(page, { navigate: false });
  await expect(page.getByRole("button", { name: "Download searchable PDF", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download recognized TXT", exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("ocr-production-success.png") });
});

test("missing OCR language assets show a retryable model-loading error", async ({ page }) => {
  test.setTimeout(90_000);
  await uploadScan(page);
  await page.route("**/eng.traineddata.gz", (route) => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.getByRole("button", { name: "Run OCR and download PDF", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("The OCR language model could not load", { timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Run OCR and download PDF", exact: true })).toBeEnabled();
  await expect.poll(() => page.workers().filter((worker) => worker.url().includes("/vendor/ocr/")).length).toBe(0);
  await page.unroute("**/eng.traineddata.gz");
  const downloaded = page.waitForEvent("download").catch(() => null);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator(".ocr-quality-result")).toBeVisible({ timeout: 45_000 });
  expect(await downloaded).not.toBeNull();
});

test("all six supported OCR language models are shipped as valid local assets", async ({ request }) => {
  for (const language of ["eng", "spa", "fra", "deu", "ita", "por"]) {
    const response = await request.get(appPath(`/vendor/ocr/${runtimeVersion}/lang/${language}.traineddata.gz`));
    expect(response.ok()).toBe(true);
    const bytes = await response.body();
    // Static hosts may send Content-Encoding: gzip and the browser/request
    // client decompresses it. Tesseract accepts either representation.
    const data = bytes[0] === 31 && bytes[1] === 139 ? gunzipSync(bytes) : bytes;
    expect(data.byteLength).toBeGreaterThan(100_000);
    expect(data.readInt32LE(0)).toBeGreaterThan(0);
    expect(data.readInt32LE(0)).toBeLessThanOrEqual(64);
  }
});

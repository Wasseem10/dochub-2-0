import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const fixture = await readFile(new URL("../../runtime-public/research/fixtures/simple-searchable.pdf", import.meta.url));
const appPath = (path) => `${process.env.GITHUB_ACTIONS ? "/dochub-2-0" : ""}${path}`;

test("print failure releases partial pages and retry prints the complete edited PDF", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    window.printProbe = { attempts: [], failSecondPage: true };
    const appendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function (node) {
      const result = appendChild.call(this, node);
      if (node.tagName !== "IFRAME" || node.title !== "PDF print document") return result;
      const attempt = { urls: [], revoked: [], canvases: [], pages: [], printed: false };
      window.printProbe.attempts.push(attempt);
      const frameWindow = node.contentWindow;
      const toBlob = frameWindow.HTMLCanvasElement.prototype.toBlob;
      frameWindow.HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
        attempt.canvases.push(this);
        if (window.printProbe.failSecondPage && attempt.canvases.length === 2) {
          callback(null);
          return;
        }
        return toBlob.call(this, callback, ...args);
      };
      const createObjectURL = window.URL.createObjectURL;
      const revokeObjectURL = window.URL.revokeObjectURL;
      // Each attempt wraps the existing functions; track only URLs created while it is active.
      window.URL.createObjectURL = function (blob) {
        const url = createObjectURL.call(this, blob);
        if (node.isConnected) attempt.urls.push(url);
        return url;
      };
      window.URL.revokeObjectURL = function (url) {
        if (attempt.urls.includes(url)) attempt.revoked.push(url);
        return revokeObjectURL.call(this, url);
      };
      frameWindow.print = () => {
        attempt.pages = [...frameWindow.document.querySelectorAll(".pdf-print-page img")].map((image) => ({
          width: image.naturalWidth, height: image.naturalHeight, complete: image.complete,
        }));
        attempt.printed = true;
      };
      return result;
    };
  });
  await page.goto(appPath("/edit-pdf"));
  await page.locator('input[type="file"]').first().setInputFiles({ name: "Synthetic print review.pdf", mimeType: "application/pdf", buffer: fixture });
  await expect(page.getByRole("img", { name: "PDF page 1", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add Text", exact: true }).click();
  const firstPage = page.locator(".page-surface").first();
  await firstPage.click({ position: { x: 90, y: 300 } });
  await firstPage.locator('.text-content[contenteditable="plaintext-only"]').last().fill("PRINT RETRY VERIFIED");
  await firstPage.locator('.text-content[contenteditable="plaintext-only"]').last().press("Tab");
  await page.locator(".reference-file-header").getByRole("button", { name: "Print", exact: true }).click();
  await expect(page.getByText("Print preparation failed. Download the PDF and try again.", { exact: true })).toBeVisible();
  await expect(page.locator('iframe[title="PDF print document"]')).toHaveCount(0);
  const failed = await page.evaluate(() => {
    const attempt = window.printProbe.attempts[0];
    return { urls: attempt.urls, revoked: attempt.revoked, printed: attempt.printed, released: attempt.canvases.every((canvas) => canvas.width === 0 && canvas.height === 0) };
  });
  expect(failed.urls).toHaveLength(1);
  expect(failed.revoked).toEqual(failed.urls);
  expect(failed.printed).toBe(false);
  expect(failed.released).toBe(true);

  await page.evaluate(() => { window.printProbe.failSecondPage = false; });
  await page.locator(".reference-file-header").getByRole("button", { name: "Print", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.printProbe.attempts[1]?.printed)).toBe(true);
  const printed = await page.evaluate(() => window.printProbe.attempts[1].pages);
  expect(printed).toHaveLength(2);
  expect(printed.every((image) => image.complete && image.width > 0 && image.height > 0)).toBe(true);
  // Expose the already-rendered print output only for the saved visual evidence.
  await page.locator('iframe[title="PDF print document"]').evaluate((iframe) => {
    Object.assign(iframe.style, { width: "100vw", height: "100vh", opacity: "1", zIndex: "99999" });
  });
  await page.screenshot({ path: testInfo.outputPath("edited-print-output.png") });
  await page.evaluate(() => document.querySelector('iframe[title="PDF print document"]').contentWindow.dispatchEvent(new Event("afterprint")));
  await expect(page.locator('iframe[title="PDF print document"]')).toHaveCount(0);
  const completed = await page.evaluate(() => {
    const attempt = window.printProbe.attempts[1];
    return { urls: attempt.urls, revoked: attempt.revoked, released: attempt.canvases.every((canvas) => canvas.width === 0 && canvas.height === 0) };
  });
  expect(completed.revoked).toEqual(completed.urls);
  expect(completed.released).toBe(true);

  await page.getByRole("button", { name: "Finish", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  const download = await pending;
  await download.saveAs(testInfo.outputPath("edited-print-review.pdf"));
  const task = pdfjs.getDocument({ data: new Uint8Array(await readFile(await download.path())), verbosity: 0 });
  try {
    const document = await task.promise;
    expect(document.numPages).toBe(2);
    const text = (await (await document.getPage(1)).getTextContent()).items.map((item) => item.str).join(" ");
    expect(text).toContain("PRINT RETRY VERIFIED");
    expect(text).toContain("Browser PDF benchmark");
    expect((await (await document.getPage(2)).getTextContent()).items.map((item) => item.str).join(" ")).toContain("Verification checklist");
  } finally {
    await task.destroy();
  }
});

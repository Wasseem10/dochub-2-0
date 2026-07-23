import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument, degrees, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;

async function editorFixture() {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Editor recovery fixture");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const first = pdf.addPage([612, 792]);
  first.drawText("ORIGINAL ACCOUNT TOTAL", { x: 72, y: 680, size: 18, font });
  const second = pdf.addPage([420, 612]);
  second.setRotation(degrees(90));
  second.drawText("ROTATED SECOND PAGE", { x: 48, y: 540, size: 16, font });
  return Buffer.from(await pdf.save());
}

async function extractedText(bytes) {
  const document = await pdfjsLib.getDocument({ data: new Uint8Array(bytes), disableWorker: true, verbosity: 0 }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    pages.push((await (await document.getPage(pageNumber)).getTextContent()).items.map((item) => item.str).join(" "));
  }
  await document.destroy?.();
  return pages;
}

test("existing-text edits undo, redo, autosave, survive reload, and export", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("android") || testInfo.project.name.includes("iphone"), "Detailed history and reload validation runs on desktop engines.");
  await page.goto(appPath("/edit-pdf"));
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "recovery.pdf",
    mimeType: "application/pdf",
    buffer: await editorFixture(),
  });

  const detected = page.locator(".detected-text-item").filter({ hasText: "ORIGINAL ACCOUNT TOTAL" });
  await page.getByRole("button", { name: "Edit Text", exact: true }).click();
  await detected.click();
  const content = detected.locator(".detected-text-content");
  await content.fill("UPDATED ACCOUNT TOTAL 42000");
  await expect(page.locator(".reference-save-state")).toContainText("Unsaved changes");
  await page.getByRole("button", { name: "Download", exact: true }).focus();

  const undo = page.getByRole("button", { name: "Undo", exact: true });
  const redo = page.getByRole("button", { name: "Redo", exact: true });
  await expect(undo).toBeEnabled();
  await undo.click();
  await expect(page.locator(".detected-text-item").filter({ hasText: "ORIGINAL ACCOUNT TOTAL" })).toBeVisible();
  await expect(redo).toBeEnabled();
  await redo.click();
  await expect(page.locator(".detected-text-item").filter({ hasText: "UPDATED ACCOUNT TOTAL 42000" })).toBeVisible();

  await expect(page.locator(".reference-save-state")).toContainText("Unsaved changes");
  await expect(page.locator(".reference-save-state")).toContainText("Saved in this browser", { timeout: 5_000 });
  const editorUrl = page.url();
  await page.reload();
  await expect(page).toHaveURL(editorUrl);
  await expect(page.locator(".detected-text-item").filter({ hasText: "UPDATED ACCOUNT TOTAL 42000" })).toBeVisible();

  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const download = await pending;
  const bytes = await readFile(await download.path());
  const text = await extractedText(bytes);
  expect(text[0]).toContain("UPDATED ACCOUNT TOTAL 42000");
  expect(text[0]).not.toContain("ORIGINAL ACCOUNT TOTAL");
});

test("mixed-size and rotated pages retain page order through organization history", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("android") || testInfo.project.name.includes("iphone"), "Downloaded page-plan validation runs on desktop engines.");
  await page.goto(appPath("/edit-pdf"));
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "mixed-pages.pdf",
    mimeType: "application/pdf",
    buffer: await editorFixture(),
  });
  await expect(page.locator(".page-thumbnail-item")).toHaveCount(2);

  await page.getByRole("button", { name: "Manage pages" }).click();
  await page.getByRole("button", { name: /Page 2\./ }).click();
  await page.getByRole("button", { name: "Duplicate page 2" }).click();
  await expect(page.locator(".page-thumbnail-item")).toHaveCount(3);
  await page.getByRole("button", { name: /Page 1\./ }).click();
  await page.getByRole("button", { name: "Rotate page 1" }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Redo", exact: true }).click();

  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const download = await pending;
  const bytes = await readFile(await download.path());
  const exported = await PDFDocument.load(bytes);
  expect(exported.getTitle()).toBe("Editor recovery fixture");
  expect(exported.getPageCount()).toBe(3);
  expect(exported.getPages().map((pdfPage) => pdfPage.getRotation().angle)).toEqual([90, 90, 90]);
  expect(exported.getPages().map((pdfPage) => [pdfPage.getWidth(), pdfPage.getHeight()])).toEqual([[612, 792], [420, 612], [420, 612]]);
  expect(await extractedText(bytes)).toEqual(expect.arrayContaining([
    expect.stringContaining("ORIGINAL ACCOUNT TOTAL"),
    expect.stringContaining("ROTATED SECOND PAGE"),
  ]));
});

test("mobile editor collapses thumbnails, keeps tools reachable, fits the page, and places a check", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("android") && !testInfo.project.name.includes("iphone"), "Mobile layout validation runs on phone projects.");
  await page.goto(appPath("/edit-pdf"));
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "mobile-edit.pdf",
    mimeType: "application/pdf",
    buffer: await editorFixture(),
  });

  const thumbnails = page.getByRole("button", { name: "Thumbnails", exact: true });
  await expect(thumbnails).toHaveAttribute("aria-expanded", "false");
  const toolbar = page.getByRole("region", { name: "PDF editing toolbar" });
  await expect(toolbar).toBeVisible();
  const toolbarLayout = await toolbar.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(toolbarLayout.scrollWidth, `toolbar should fit within ${toolbarLayout.clientWidth}px`).toBeLessThanOrEqual(toolbarLayout.clientWidth + 1);

  const moreTools = toolbar.getByRole("button", { name: "More", exact: true });
  await expect(moreTools).toBeVisible();
  await moreTools.click();
  const compactToolsMenu = page.getByRole("menu", { name: "More editing tools" });
  await expect(compactToolsMenu).toBeVisible();
  const check = compactToolsMenu.getByRole("menuitem", { name: "Check", exact: true });
  await check.click();
  await expect(compactToolsMenu).toBeHidden();

  const surface = page.locator(".page-surface");
  await expect(surface).toBeVisible();
  const fitsViewport = await surface.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.left >= -1 && rect.right <= window.innerWidth + 1 && rect.width <= window.innerWidth + 1;
  });
  expect(fitsViewport).toBe(true);
  const box = await surface.boundingBox();
  await surface.click({ position: { x: Math.min(120, box.width * 0.3), y: Math.min(260, box.height * 0.35) } });
  await expect(page.locator(".annotation.checkbox-field")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("editor rejects a corrupted PDF with a recoverable explanation", async ({ page }) => {
  await page.goto(appPath("/edit-pdf"));
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "corrupted.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("this is not a PDF"),
  });
  await expect(page.getByText(/corrupted or invalid/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload from your device" })).toBeVisible();
});

import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;
const phoneProjects = new Set(["android-chromium", "iphone-webkit"]);
const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFElEQVR42mP4z8DwH4QZGBgYGJAAADn5Af+GmrmUAAAAAElFTkSuQmCC", "base64");

async function editorPdf(pageCount, title = "Mobile editor resilience fixture") {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setSubject("Large-document recovery, autosave, and mobile export fidelity");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < pageCount; index += 1) {
    const page = pdf.addPage([612, 792]);
    page.drawText(`MOBILE FIXTURE PAGE ${index + 1}`, { x: 64, y: 700, size: 17, font });
  }
  return Buffer.from(await pdf.save());
}

async function openEditor(page, { pageCount = 2, name = "mobile-editor.pdf", title } = {}) {
  await page.goto(appPath("/edit-pdf"));
  await page.locator('input[type="file"]').first().setInputFiles({
    name,
    mimeType: "application/pdf",
    buffer: await editorPdf(pageCount, title),
  });
  await expect(page.locator(".page-thumbnail-item")).toHaveCount(pageCount);
  await expect(page.getByRole("img", { name: "PDF page 1" })).toBeVisible({ timeout: 20_000 });
}

async function goToPage(page, pageNumber) {
  await page.getByLabel("Current page").fill(String(pageNumber));
  await expect(page.getByLabel("Current page")).toHaveValue(String(pageNumber));
  await expect(page.getByRole("img", { name: `PDF page ${pageNumber}` })).toBeVisible({ timeout: 20_000 });
}

async function activateMobileTool(page, name) {
  const more = page.getByRole("button", { name: "More editing tools", exact: true });
  await more.click();
  const menu = page.getByRole("menu", { name: "More editing tools" });
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitem", { name, exact: true }).click();
  await expect(menu).toBeHidden();
}

async function clickSurface(page, xRatio, yRatio) {
  const surface = page.locator(".page-surface");
  const box = await surface.boundingBox();
  await surface.click({ position: { x: box.width * xRatio, y: box.height * yRatio } });
}

async function dragSurface(page, start, end) {
  const surface = page.locator(".page-surface");
  const box = await surface.boundingBox();
  await page.mouse.move(box.x + box.width * start.x, box.y + box.height * start.y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * end.x, box.y + box.height * end.y, { steps: 5 });
  await page.mouse.up();
}

async function downloadEditedPdf(page) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const download = await pending;
  return {
    download,
    bytes: new Uint8Array(await readFile(await download.path())),
  };
}

async function extractedTextByPage(bytes) {
  const document = await pdfjsLib.getDocument({ data: bytes.slice(0), disableWorker: true, verbosity: 0 }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const content = await (await document.getPage(pageNumber)).getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  await document.destroy?.();
  return pages;
}

for (const pageCount of [50, 100, 200]) {
  test(`${pageCount}-page PDFs recover visible pages and export on phones`, async ({ page }, testInfo) => {
    test.skip(!phoneProjects.has(testInfo.project.name), "Large-document phone coverage runs on Android and iPhone.");
    test.setTimeout(150_000);
    const runtimeFailures = [];
    page.on("pageerror", (error) => runtimeFailures.push(error.message));
    page.on("crash", () => runtimeFailures.push("page crashed"));

    await openEditor(page, {
      pageCount,
      name: `mobile-${pageCount}-pages.pdf`,
      title: `Mobile ${pageCount}-page fixture`,
    });

    for (const target of [Math.ceil(pageCount / 2), pageCount]) {
      await goToPage(page, target);
      const activeImage = page.getByRole("img", { name: `PDF page ${target}` });
      await activeImage.evaluate((image) => image.dispatchEvent(new Event("error", { bubbles: true })));
      await expect(page.getByRole("img", { name: `PDF page ${target}` })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole("button", { name: "Reload page" })).toHaveCount(0);
    }

    const exported = await downloadEditedPdf(page);
    const parsed = await PDFDocument.load(exported.bytes);
    expect(parsed.getPageCount()).toBe(pageCount);
    expect(parsed.getTitle()).toBe(`Mobile ${pageCount}-page fixture`);
    expect(parsed.getSubject()).toBe("Large-document recovery, autosave, and mobile export fidelity");
    expect(runtimeFailures).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}

test("a 200-page phone edit autosaves, survives reload, and remains downloadable", async ({ page }, testInfo) => {
  test.skip(!phoneProjects.has(testInfo.project.name), "Large-document phone coverage runs on Android and iPhone.");
  test.setTimeout(180_000);
  await openEditor(page, { pageCount: 200, name: "mobile-autosave-200.pdf" });
  await goToPage(page, 200);

  await activateMobileTool(page, "Note");
  await clickSurface(page, 0.28, 0.32);
  const note = page.locator(".annotation.comment-marker");
  await expect(note).toHaveCount(1);
  await note.locator("textarea[aria-label='Note text']").fill("Remember the final mobile page");
  await activateMobileTool(page, "Select");
  await expect(page.locator(".reference-save-state")).toContainText("Saved in this browser", { timeout: 8_000 });

  const editorUrl = page.url();
  await page.reload();
  await expect(page).toHaveURL(editorUrl);
  await goToPage(page, 200);
  await expect(page.locator(".annotation.comment-marker")).toHaveCount(1);

  const exported = await downloadEditedPdf(page);
  expect((await PDFDocument.load(exported.bytes)).getPageCount()).toBe(200);
});

test("mobile annotations, history, links, images, notes, and stamps survive export", async ({ page }, testInfo) => {
  test.skip(!phoneProjects.has(testInfo.project.name), "Editor tool coverage runs on Android and iPhone.");
  test.setTimeout(120_000);
  await openEditor(page, { pageCount: 1, name: "mobile-tools.pdf" });

  await activateMobileTool(page, "Highlight");
  await dragSurface(page, { x: 0.12, y: 0.18 }, { x: 0.62, y: 0.24 });
  await expect(page.locator(".annotation.highlight")).toHaveCount(1);

  await activateMobileTool(page, "Text Highlight");
  await clickSurface(page, 0.18, 0.28);
  await expect(page.locator(".annotation.highlight")).toHaveCount(2);

  await activateMobileTool(page, "Stamp");
  await clickSurface(page, 0.14, 0.34);
  await expect(page.locator(".annotation.stamp-annotation")).toContainText("APPROVED");

  await activateMobileTool(page, "Note");
  await clickSurface(page, 0.78, 0.3);
  const note = page.locator(".annotation.comment-marker");
  await note.locator("textarea[aria-label='Note text']").fill("Mobile review note");

  await activateMobileTool(page, "Link");
  await clickSurface(page, 0.14, 0.48);
  const linkDialog = page.getByRole("dialog", { name: "Add link" });
  await expect(linkDialog).toBeVisible();
  await linkDialog.getByLabel("Web address").fill("https://example.com/mobile-review");
  await linkDialog.getByRole("button", { name: "Add link", exact: true }).click();
  await expect(linkDialog).toHaveCount(0);
  await expect(page.locator(".annotation.link-annotation")).toContainText("example.com/mobile-review");

  await activateMobileTool(page, "Image");
  await page.locator("input.hidden-input[accept='image/png,image/jpeg']").setInputFiles({
    name: "mobile-mark.png",
    mimeType: "image/png",
    buffer: tinyPng,
  });
  await expect(page.getByText("Image ready. Click the PDF page to place it.")).toBeVisible();
  await clickSurface(page, 0.55, 0.55);
  await expect(page.locator(".annotation.image-annotation")).toHaveCount(1);

  const undo = page.getByRole("button", { name: "Undo", exact: true });
  const redo = page.getByRole("button", { name: "Redo", exact: true });
  await undo.click();
  await expect(page.locator(".annotation.image-annotation")).toHaveCount(0);
  if (await redo.isVisible()) await redo.click();
  else await activateMobileTool(page, "Redo");
  await expect(page.locator(".annotation.image-annotation")).toHaveCount(1);

  const exported = await downloadEditedPdf(page);
  const parsed = await PDFDocument.load(exported.bytes);
  expect(parsed.getPageCount()).toBe(1);
  const rendered = await pdfjsLib.getDocument({ data: exported.bytes.slice(0), disableWorker: true, verbosity: 0 }).promise;
  const exportedPage = await rendered.getPage(1);
  const annotations = await exportedPage.getAnnotations();
  expect(annotations.some((annotation) => annotation.subtype === "Link" && annotation.url === "https://example.com/mobile-review")).toBe(true);
  expect(annotations.some((annotation) => annotation.subtype === "Text" && String(annotation.contents || annotation.contentsObj?.str || "").includes("Mobile review note"))).toBe(true);
  const operators = await exportedPage.getOperatorList();
  expect(operators.fnArray).toContain(pdfjsLib.OPS.paintImageXObject);
  await rendered.destroy?.();
  expect((await extractedTextByPage(exported.bytes))[0]).toContain("APPROVED");
});

test("mobile page reordering, print preparation, and export preserve page order", async ({ page }, testInfo) => {
  test.skip(!phoneProjects.has(testInfo.project.name), "Editor tool coverage runs on Android and iPhone.");
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    globalThis.__pdfEnrichPrintCapture = null;
    const observer = new MutationObserver(() => {
      const frame = document.querySelector('iframe[title="PDF print document"]');
      if (!frame?.contentWindow || frame.contentWindow.__pdfEnrichPrintHooked) return;
      frame.contentWindow.__pdfEnrichPrintHooked = true;
      frame.contentWindow.print = () => {
        globalThis.__pdfEnrichPrintCapture = {
          pages: frame.contentDocument?.querySelectorAll(".pdf-print-page").length || 0,
          editorShells: frame.contentDocument?.querySelectorAll(".editor-shell").length || 0,
        };
      };
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await openEditor(page, { pageCount: 2, name: "mobile-page-order.pdf" });

  await activateMobileTool(page, "Manage pages");
  await page.getByRole("button", { name: /Page 2\./ }).click();
  await page.getByRole("button", { name: "Move page 2 up", exact: true }).click();
  await expect(page.getByLabel("Current page")).toHaveValue("1");
  await page.getByRole("button", { name: "Close thumbnails", exact: true }).click();

  await activateMobileTool(page, "Print document");
  await expect.poll(() => page.evaluate(() => globalThis.__pdfEnrichPrintCapture)).toEqual({ pages: 2, editorShells: 0 });
  await expect(page.getByText("The PDF was sent to your printer dialog.")).toBeVisible();

  const exported = await downloadEditedPdf(page);
  expect(await extractedTextByPage(exported.bytes)).toEqual([
    expect.stringContaining("MOBILE FIXTURE PAGE 2"),
    expect.stringContaining("MOBILE FIXTURE PAGE 1"),
  ]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

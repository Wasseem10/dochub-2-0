import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;

async function styledEditorPdf() {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Styled text fidelity fixture");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const page = pdf.addPage([612, 792]);
  page.drawRectangle({ x: 54, y: 620, width: 420, height: 72, color: rgb(0.96, 0.91, 0.8) });
  page.drawText("Original quarterly total", { x: 72, y: 650, size: 18, font, color: rgb(0.12, 0.12, 0.18) });
  return Buffer.from(await pdf.save());
}

test("existing PDF text keeps its detected style, baseline, and page background on export", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("android") || testInfo.project.name.includes("iphone"), "Detailed PDF text export verification runs on desktop engines.");
  await page.goto(appPath("/edit-pdf"));
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "styled-text.pdf",
    mimeType: "application/pdf",
    buffer: await styledEditorPdf(),
  });

  const detected = page.locator(".detected-text-item").first();
  await expect(detected).toContainText("Original quarterly total");
  await expect(page.getByRole("button", { name: "Select", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(detected).toHaveCSS("pointer-events", "none");
  await page.getByRole("button", { name: "Edit Text", exact: true }).click();
  await expect(detected).toHaveCSS("pointer-events", "auto");
  await detected.click();
  const editable = detected.locator(".detected-text-content");
  const replacement = "Updated quarterly total for every region and department in the annual operating plan";
  await editable.fill(replacement);
  await expect(detected).toHaveCSS("font-family", "serif");
  await expect(detected).toHaveCSS("font-style", "normal");
  await expect(detected).toHaveCSS("font-weight", "400");
  await expect(detected).not.toHaveCSS("background-color", "rgb(255, 255, 255)");

  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const download = await pending;
  const savedPath = testInfo.outputPath("styled-text-export.pdf");
  await download.saveAs(savedPath);
  const outputBytes = new Uint8Array(await readFile(savedPath));
  const exported = await PDFDocument.load(outputBytes);
  expect(exported.getTitle()).toBe("Styled text fidelity fixture");
  expect(exported.getPageCount()).toBe(1);

  const rendered = await pdfjsLib.getDocument({ data: outputBytes.slice(0), disableWorker: true, verbosity: 0 }).promise;
  const text = await (await rendered.getPage(1)).getTextContent();
  const extractedText = text.items.map((item) => item.str).join(" ");
  expect(extractedText).toContain("Updated quarterly total");
  expect(extractedText).toContain("annual operating plan");
  expect(extractedText).not.toContain("Original quarterly total");
  const replacementItems = text.items.filter((item) => /Updated quarterly|annual operating plan/.test(item.str));
  expect(replacementItems.length).toBeGreaterThan(1);
});

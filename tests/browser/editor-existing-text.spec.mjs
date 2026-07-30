import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;
const elementFrame = (locator) => locator.evaluate((element) => ({
  x: element.offsetLeft,
  y: element.offsetTop,
  width: element.offsetWidth,
  height: element.offsetHeight,
}));

async function styledEditorPdf() {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Styled text fidelity fixture");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const page = pdf.addPage([612, 792]);
  const primaryText = "Original quarterly total";
  const fontSize = 18;
  const primaryX = 72;
  const neighborX = primaryX + font.widthOfTextAtSize(primaryText, fontSize) + 4;
  page.drawRectangle({ x: 54, y: 620, width: 420, height: 72, color: rgb(0.96, 0.91, 0.8) });
  page.drawText(primaryText, { x: primaryX, y: 650, size: fontSize, font, color: rgb(0.12, 0.12, 0.18) });
  page.drawText("Neighbor text stays untouched", { x: neighborX, y: 650, size: fontSize, font, color: rgb(0.12, 0.12, 0.18) });
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

  const detectedMatch = page.locator(".detected-text-item").filter({ hasText: "quarterly" });
  const neighborMatch = page.locator(".detected-text-item").filter({ hasText: "Neighbor" });
  await expect(detectedMatch).toHaveText("quarterly");
  await expect(neighborMatch).toHaveText("Neighbor");
  const detectedId = await detectedMatch.getAttribute("data-detected-text-id");
  const neighborId = await neighborMatch.getAttribute("data-detected-text-id");
  const detected = page.locator(`[data-detected-text-id="${detectedId}"]`);
  const neighbor = page.locator(`[data-detected-text-id="${neighborId}"]`);
  expect(detectedId).not.toBe(neighborId);
  await expect(detected).toHaveText("quarterly");
  await expect(neighbor).toHaveText("Neighbor");
  const initialDetectedBox = await elementFrame(detected);
  const initialNeighborBox = await elementFrame(neighbor);
  await expect(page.getByRole("button", { name: "Select", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(detected).toHaveCSS("pointer-events", "none");
  await page.getByRole("button", { name: "Edit Text", exact: true }).click();
  await expect(page.locator(".toast")).toHaveCount(0);
  await expect(detected).toHaveCSS("pointer-events", "auto");
  await detected.click();
  const editable = detected.locator(".detected-text-content");
  const replacement = "Updated quarterly";
  await editable.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await editable.pressSequentially(replacement);
  await editable.press("Escape");
  const editedDetectedBox = await elementFrame(detected);
  const editedNeighborBox = await elementFrame(neighbor);
  expect(Math.abs(editedDetectedBox.width - initialDetectedBox.width)).toBeLessThan(1);
  expect(Math.abs(editedDetectedBox.height - initialDetectedBox.height)).toBeLessThan(1);
  expect(Math.abs(editedNeighborBox.x - initialNeighborBox.x)).toBeLessThan(1);
  expect(Math.abs(editedNeighborBox.y - initialNeighborBox.y)).toBeLessThan(1);
  expect(Math.abs(editedNeighborBox.width - initialNeighborBox.width)).toBeLessThan(1);
  expect(Math.abs(editedNeighborBox.height - initialNeighborBox.height)).toBeLessThan(1);
  await neighbor.click();
  await neighbor.locator(".detected-text-content").press("Escape");
  await expect(neighbor).not.toHaveClass(/is-edited/);
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
  expect(extractedText).toContain("Updated quarterly");
  expect(extractedText).toContain("Original");
  expect(extractedText).toContain("total");
  expect(extractedText).toContain("Neighbor text stays untouched");
  expect(extractedText).not.toContain("Original quarterly total");
  expect(text.items.some((item) => /Updated/.test(item.str))).toBe(true);
  expect(text.items.some((item) => /quarterly/.test(item.str))).toBe(true);
});

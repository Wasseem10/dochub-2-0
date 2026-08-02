import { readFile } from "node:fs/promises";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import { createPdfFromPresentation, createPdfFromWorkbook } from "../../src/tools/toPdfConversion.js";

async function bundledFonts() {
  const [regularFontBytes, boldFontBytes] = await Promise.all([
    readFile(new URL("../../runtime-public/fonts/LiberationSans-Regular.ttf", import.meta.url)),
    readFile(new URL("../../runtime-public/fonts/LiberationSans-Bold.ttf", import.meta.url)),
  ]);
  return { regularFontBytes, boldFontBytes };
}

async function extractedText(bytes) {
  const document = await pdfjsLib.getDocument({ data: bytes.slice(0), disableWorker: true, verbosity: 0 }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    pages.push((await page.getTextContent()).items.map((item) => item.str).join(" "));
  }
  return pages.join(" ");
}

describe("conversion text fidelity", () => {
  it("preserves accented, Greek, and Cyrillic spreadsheet text", async () => {
    const bytes = await createPdfFromWorkbook({ sheets: [{ name: "Résumé", rows: [["Language", "Value"], ["Greek", "Ελληνικά"], ["Cyrillic", "Кириллица"]] }] }, {
      title: "International report",
      ...await bundledFonts(),
    });
    expect(await extractedText(bytes)).toContain("Résumé");
    expect(await extractedText(bytes)).toContain("Ελληνικά");
    expect(await extractedText(bytes)).toContain("Кириллица");
  });

  it("preserves Unicode presentation text in its positioned shape", async () => {
    const bytes = await createPdfFromPresentation({
      width: 12_192_000,
      height: 6_858_000,
      slides: [{ background: "FFFFFF", elements: [{ type: "shape", x: 800_000, y: 800_000, width: 8_000_000, height: 1_500_000, text: "Résumé · Ελληνικά · Кириллица", size: 28, bold: false, color: "172033", fill: "FFFFFF" }] }],
    }, { title: "International slides", ...await bundledFonts() });
    expect(await extractedText(bytes)).toContain("Résumé · Ελληνικά · Кириллица");
  });
});

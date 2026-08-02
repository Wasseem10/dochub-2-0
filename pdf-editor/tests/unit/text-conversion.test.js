import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import { createPdfFromPlainText, textContentToPlainText, validateTextConversionFile } from "../../src/tools/textConversion.js";

function mockFile(name, type, size = 100) {
  return { name, type, size };
}

describe("text conversion", () => {
  it("validates PDF and TXT inputs", () => {
    expect(validateTextConversionFile(mockFile("document.pdf", "application/pdf"), "pdf")).toBe("");
    expect(validateTextConversionFile(mockFile("notes.txt", "text/plain"), "txt")).toBe("");
    expect(validateTextConversionFile(mockFile("photo.jpg", "image/jpeg"), "txt")).toMatch(/plain TXT/);
  });

  it("preserves explicit PDF text line endings", () => {
    expect(textContentToPlainText({ items: [{ str: "First", hasEOL: true }, { str: "Second", hasEOL: false }, { str: "line", hasEOL: true }] })).toBe("First\nSecond line");
  });

  it("creates a searchable, paginated PDF from text", async () => {
    const bytes = await createPdfFromPlainText("PDFEnrich text conversion\n\n" + "A long readable sentence. ".repeat(500), { title: "Notes", fontSize: 12 });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getTitle()).toBe("Notes");
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });

  it("embeds Unicode text without replacing common non-Latin characters", async () => {
    const [regularFontBytes, boldFontBytes] = await Promise.all([
      readFile(new URL("../../runtime-public/fonts/LiberationSans-Regular.ttf", import.meta.url)),
      readFile(new URL("../../runtime-public/fonts/LiberationSans-Bold.ttf", import.meta.url)),
    ]);
    const bytes = await createPdfFromPlainText("Résumé · Ελληνικά · Кириллица", {
      title: "Unicode notes",
      regularFontBytes,
      boldFontBytes,
    });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    const rendered = await pdfjsLib.getDocument({ data: bytes.slice(0), disableWorker: true, verbosity: 0 }).promise;
    const content = await (await rendered.getPage(1)).getTextContent();
    expect(content.items.map((item) => item.str).join(" ")).toContain("Résumé · Ελληνικά · Кириллица");
  });
});

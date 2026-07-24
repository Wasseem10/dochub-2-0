import { PDFDocument } from "pdf-lib";
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
    const bytes = await createPdfFromPlainText("PDFArrow text conversion\n\n" + "A long readable sentence. ".repeat(500), { title: "Notes", fontSize: 12 });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getTitle()).toBe("Notes");
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });
});

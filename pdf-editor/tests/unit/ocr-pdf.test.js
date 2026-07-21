import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { createSearchablePdfFromOcrPages, flattenOcrWords, ocrTextFromPages, validateOcrPdf } from "../../src/tools/ocrPdf.js";

const PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));

describe("OCR PDF output", () => {
  it("flattens OCR word geometry and creates a searchable image PDF", async () => {
    const data = { blocks: [{ paragraphs: [{ lines: [{ words: [{ text: "Invoice", confidence: 98, bbox: { x0: 10, y0: 20, x1: 90, y1: 42 } }] }] }] }] };
    const words = flattenOcrWords(data);
    expect(words).toEqual([{ text: "Invoice", confidence: 98, bbox: { x0: 10, y0: 20, x1: 90, y1: 42 } }]);
    expect(ocrTextFromPages([{ words, text: "Invoice" }])).toContain("Page 1\nInvoice");
    const bytes = await createSearchablePdfFromOcrPages([{ imageBytes: PNG, imageWidth: 100, imageHeight: 120, words }]);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  it("enforces PDF type and size limits", () => {
    expect(validateOcrPdf({ name: "scan.jpg", type: "image/jpeg", size: 10 })).toContain("PDF");
    expect(validateOcrPdf({ name: "scan.pdf", type: "application/pdf", size: 13 * 1024 * 1024 })).toContain("12 MB");
  });
});

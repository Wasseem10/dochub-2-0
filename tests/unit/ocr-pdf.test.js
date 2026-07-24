import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  createSearchablePdfFromOcrPages,
  enhanceOcrImageData,
  flattenOcrWords,
  isSupportedOcrLanguage,
  ocrRenderScaleForPage,
  ocrTextFromPages,
  summarizeOcrConfidence,
  validateOcrPdf,
} from "../../src/tools/ocrPdf.js";

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
    expect(validateOcrPdf({ name: "scan.pdf", type: "application/pdf", size: 21 * 1024 * 1024 })).toContain("20 MB");
  });

  it("cleans low-contrast scans and reports recognition quality", () => {
    const image = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([90, 90, 90, 255, 210, 210, 210, 255]),
    };
    const enhanced = enhanceOcrImageData(image, "document");
    expect(Array.from(enhanced.data)).toEqual([0, 0, 0, 255, 255, 255, 255, 255]);
    const summary = summarizeOcrConfidence([{ words: [
      { text: "clear", confidence: 96 },
      { text: "blurred", confidence: 58 },
    ] }]);
    expect(summary).toMatchObject({ wordCount: 2, averageConfidence: 77, lowConfidenceWords: 1, rating: "Review suggested" });
  });

  it("supports common Western European OCR models and caps huge render surfaces", () => {
    expect(isSupportedOcrLanguage("spa")).toBe(true);
    expect(isSupportedOcrLanguage("jpn")).toBe(false);
    expect(ocrRenderScaleForPage(10_000, 10_000)).toBe(1.4);
  });

  it("keeps accented OCR text in the extracted TXT output", () => {
    expect(ocrTextFromPages([{ text: "Résumé déjà payé", words: [] }])).toContain("Résumé déjà payé");
  });
});

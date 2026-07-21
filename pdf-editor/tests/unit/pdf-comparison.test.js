import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { compareRgbaImages, compareTextStrings, createComparisonPdfReport, validateComparisonPdf } from "../../src/tools/pdfComparison.js";

const PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));

describe("PDF comparison", () => {
  it("finds changed image tiles and word additions or removals", () => {
    const first = new Uint8ClampedArray(8 * 8 * 4).fill(255);
    const second = new Uint8ClampedArray(first);
    for (let index = 0; index < 4 * 4; index += 1) second[index * 4] = 0;
    const visual = compareRgbaImages(first, second, 8, 8, { tileSize: 4, minimumRatio: 0.01 });
    expect(visual.rects.length).toBeGreaterThan(0);
    expect(visual.similarity).toBeLessThan(100);
    expect(compareTextStrings("approved total 42", "revised total 43")).toEqual({ added: 2, removed: 2, changed: 4 });
  });

  it("creates a valid marked comparison report", async () => {
    const bytes = await createComparisonPdfReport([{ pageNumber: 1, statusLabel: "Changed", similarity: 82, textAdded: 2, textRemoved: 1, firstPng: PNG, secondPng: PNG, rects: [{ x: 0.1, y: 0.1, width: 0.2, height: 0.1 }] }]);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  it("enforces file type and size limits", () => {
    expect(validateComparisonPdf({ name: "notes.txt", type: "text/plain", size: 10 })).toContain("PDF");
    expect(validateComparisonPdf({ name: "large.pdf", type: "application/pdf", size: 26 * 1024 * 1024 })).toContain("25 MB");
  });
});

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

  it("groups adjacent changed tiles into clean review regions", () => {
    const width = 24;
    const height = 12;
    const first = new Uint8ClampedArray(width * height * 4).fill(255);
    const second = new Uint8ClampedArray(first);
    for (let y = 0; y < 6; y += 1) {
      for (let x = 0; x < 18; x += 1) {
        const offset = (y * width + x) * 4;
        second[offset] = 0;
        second[offset + 1] = 0;
        second[offset + 2] = 0;
      }
    }
    const visual = compareRgbaImages(first, second, width, height, { tileSize: 6, minimumRatio: 0.03 });
    expect(visual.rects).toHaveLength(1);
    expect(visual.rects[0].width).toBeGreaterThan(0.7);
  });

  it("filters sub-threshold pixel noise, preserves small edits, and limits visual clutter", () => {
    const width = 64;
    const height = 64;
    const first = new Uint8ClampedArray(width * height * 4).fill(255);
    const noisy = new Uint8ClampedArray(first);
    noisy[0] = 0;
    noisy[1] = 0;
    noisy[2] = 0;
    expect(compareRgbaImages(first, noisy, width, height, { tileSize: 16, minimumRatio: 0.03 }).rects).toHaveLength(0);

    noisy[4] = 0;
    noisy[5] = 0;
    noisy[6] = 0;
    noisy[8] = 0;
    noisy[9] = 0;
    noisy[10] = 0;
    expect(compareRgbaImages(first, noisy, width, height, { tileSize: 16, minimumRatio: 0.03 }).rects).toHaveLength(1);

    const changed = new Uint8ClampedArray(first);
    for (let top = 0; top < height; top += 16) {
      for (let left = 0; left < width; left += 16) {
        for (let y = top; y < top + 8; y += 1) {
          for (let x = left; x < left + 8; x += 1) {
            const offset = (y * width + x) * 4;
            changed[offset] = 0;
            changed[offset + 1] = 0;
            changed[offset + 2] = 0;
          }
        }
      }
    }
    const limited = compareRgbaImages(first, changed, width, height, { tileSize: 8, minimumRatio: 0.03, maxRegions: 4 });
    expect(limited.rects.length).toBeLessThanOrEqual(4);
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

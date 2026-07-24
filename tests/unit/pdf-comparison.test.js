import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { comparePositionedWords, compareRgbaImages, compareTextStrings, createComparisonPdfReport, extractPositionedWords, validateComparisonPdf } from "../../src/tools/pdfComparison.js";

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

  it("creates precise inserted, deleted, and replaced word changes with page coordinates", () => {
    const word = (text, x) => ({ text, normalized: text.toLowerCase(), x, y: 0.2, width: 0.08, height: 0.03 });
    const original = [word("Quarterly", 0.1), word("Draft", 0.2), word("Total", 0.3), word("42000", 0.4)];
    const revised = [word("Quarterly", 0.1), word("Approved", 0.2), word("Total", 0.3), word("48000", 0.4), word("USD", 0.5)];
    const comparison = comparePositionedWords(original, revised, { pageNumber: 3 });

    expect(comparison.added).toBe(3);
    expect(comparison.removed).toBe(2);
    expect(comparison.changes).toHaveLength(2);
    expect(comparison.changes[0]).toMatchObject({ pageNumber: 3, type: "replaced", removedText: "Draft", addedText: "Approved" });
    expect(comparison.changes[1]).toMatchObject({ type: "replaced", removedText: "42000", addedText: "48000 USD" });
    expect(comparison.changes[0].removedRects[0].x).toBeGreaterThan(0.19);
    expect(comparison.changes[0].addedRects[0].width).toBeGreaterThan(0.08);
  });

  it("detects moved phrases and extracts normalized word boxes from PDF text items", () => {
    const viewport = { width: 600, height: 800, convertToViewportPoint: (x, y) => [x, 800 - y] };
    const words = extractPositionedWords({ items: [{ str: "CERTIFICATIONS CompTIA Security+", width: 240, height: 12, transform: [1, 0, 0, 12, 60, 650] }] }, viewport);
    expect(words.map((item) => item.text)).toEqual(["CERTIFICATIONS", "CompTIA", "Security"]);
    expect(words[0].x).toBeCloseTo(0.1);
    expect(words[0].y).toBeGreaterThan(0.16);

    const positioned = (text, x, y) => ({ text, normalized: text.toLowerCase(), x, y, width: 0.08, height: 0.03 });
    const original = [positioned("A", .1, .1), positioned("moved", .1, .3), positioned("section", .2, .3), positioned("keep", .1, .5), positioned("these", .2, .5), positioned("anchors", .3, .5)];
    const revised = [positioned("A", .1, .1), positioned("keep", .1, .3), positioned("these", .2, .3), positioned("anchors", .3, .3), positioned("moved", .1, .5), positioned("section", .2, .5)];
    const comparison = comparePositionedWords(original, revised);
    expect(comparison.changes.some((change) => change.type === "moved")).toBe(true);
    expect(comparison.added).toBe(0);
    expect(comparison.removed).toBe(0);
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

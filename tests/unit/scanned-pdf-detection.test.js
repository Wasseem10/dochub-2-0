import { describe, expect, it, vi } from "vitest";
import { detectScannedPdf } from "../../src/tools/scannedPdfDetection.js";

function pdfFile() {
  return {
    name: "scan.pdf",
    type: "application/pdf",
    size: 4,
    arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
  };
}

function pdfjsWithPages(textByPage) {
  const cleanups = textByPage.map(() => vi.fn());
  const destroy = vi.fn();
  return {
    cleanups,
    destroy,
    loader: async () => ({
      getDocument: () => ({
        promise: Promise.resolve({
          numPages: textByPage.length,
          getPage: async (pageNumber) => ({
            getTextContent: async () => ({ items: textByPage[pageNumber - 1].map((str) => ({ str, hasEOL: true })) }),
            cleanup: cleanups[pageNumber - 1],
          }),
          destroy,
        }),
      }),
    }),
  };
}

describe("scanned PDF detection", () => {
  it("classifies an image-only PDF and retains bytes for the OCR handoff", async () => {
    const pdfjs = pdfjsWithPages([[], []]);
    const progress = vi.fn();
    const result = await detectScannedPdf(pdfFile(), { pdfjsLoader: pdfjs.loader, onProgress: progress });

    expect(result).toMatchObject({ kind: "image-only", isImageOnly: true, hasTextLayer: false, pageCount: 2 });
    expect(Array.from(result.sourceBytes)).toEqual([1, 2, 3, 4]);
    expect(progress).toHaveBeenLastCalledWith(expect.objectContaining({ progress: 100, pageNumber: 2 }));
    expect(pdfjs.cleanups.every((cleanup) => cleanup.mock.calls.length === 1)).toBe(true);
    expect(pdfjs.destroy).toHaveBeenCalledOnce();
  });

  it("returns embedded page text without OCR when meaningful text exists", async () => {
    const pdfjs = pdfjsWithPages([["Invoice 48391"], []]);
    const result = await detectScannedPdf(pdfFile(), { pdfjsLoader: pdfjs.loader });

    expect(result).toMatchObject({ kind: "mixed", isImageOnly: false, hasTextLayer: true, textPageCount: 1 });
    expect(result.pages[0].text).toContain("Invoice 48391");
  });

  it("does not let one stray glyph hide an otherwise scanned document", async () => {
    const pdfjs = pdfjsWithPages([["x"], []]);
    const result = await detectScannedPdf(pdfFile(), { pdfjsLoader: pdfjs.loader });
    expect(result.isImageOnly).toBe(true);
  });
});


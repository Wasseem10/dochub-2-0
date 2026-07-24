import { PDFDocument, rgb } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { addPageNumbersToPdf, buildPdfFromPagePlan, extractPdfPages, mergePdfDocuments, parsePageRanges, splitPdfByRanges } from "../../src/tools/pdfPageOperations.js";

async function createSourcePdf(widths) {
  const pdf = await PDFDocument.create();
  widths.forEach((width, index) => {
    const page = pdf.addPage([width, 500 + index * 10]);
    page.drawRectangle({ x: 0, y: 0, width, height: 500 + index * 10, color: rgb(index / widths.length, 0.4, 0.7) });
  });
  return pdf.save();
}

describe("high-fidelity PDF page operations", () => {
  it("parses separate page ranges with helpful bounds checking", () => {
    expect(parsePageRanges("1-3, 5, 7-8", 8)).toEqual([[0, 1, 2], [4], [6, 7]]);
    expect(() => parsePageRanges("3-1", 8)).toThrow("between pages 1 and 8");
    expect(() => parsePageRanges("9", 8)).toThrow("between pages 1 and 8");
  });

  it("reorders, rotates, duplicates, and deletes without rasterizing pages", async () => {
    const source = await createSourcePdf([200, 300, 400]);
    const output = await buildPdfFromPagePlan(source, [
      { sourceIndex: 2, rotation: 90 },
      { sourceIndex: 0, rotation: 0 },
      { sourceIndex: 2, rotation: 180 },
    ]);
    const pdf = await PDFDocument.load(output);
    expect(pdf.getPageCount()).toBe(3);
    expect(pdf.getPages().map((page) => page.getWidth())).toEqual([400, 200, 400]);
    expect(pdf.getPages().map((page) => page.getRotation().angle)).toEqual([90, 0, 180]);
  });

  it("merges, extracts, and splits into valid PDFs with the correct page order", async () => {
    const first = await createSourcePdf([210, 220]);
    const second = await createSourcePdf([310]);
    const merged = await mergePdfDocuments([{ bytes: first }, { bytes: second }]);
    expect((await PDFDocument.load(merged)).getPages().map((page) => page.getWidth())).toEqual([210, 220, 310]);

    const extracted = await extractPdfPages(merged, [2, 0]);
    expect((await PDFDocument.load(extracted)).getPages().map((page) => page.getWidth())).toEqual([210, 310]);

    const split = await splitPdfByRanges(merged, [[0, 1], [2]]);
    expect(split).toHaveLength(2);
    expect(split.map((part) => part.name)).toEqual(["pages-1-2.pdf", "page-3.pdf"]);
    expect((await PDFDocument.load(split[0].bytes)).getPageCount()).toBe(2);
    expect((await PDFDocument.load(split[1].bytes)).getPages()[0].getWidth()).toBe(310);
  });

  it("adds sequential page numbers without changing page dimensions", async () => {
    const source = await createSourcePdf([210, 220, 230]);
    const numbered = await addPageNumbersToPdf(source, { position: "top-right", startAt: 7, fontSize: 16 });
    const pdf = await PDFDocument.load(numbered);
    expect(pdf.getPageCount()).toBe(3);
    expect(pdf.getPages().map((page) => page.getWidth())).toEqual([210, 220, 230]);
    expect(numbered.length).toBeGreaterThan(source.length);
    await expect(addPageNumbersToPdf(source, { position: "middle-center" })).rejects.toThrow("valid page-number position");
  });
});

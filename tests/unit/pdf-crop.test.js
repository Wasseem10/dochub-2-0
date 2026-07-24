import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { cropPdfPages } from "../../src/tools/pdfCrop.js";

async function sourcePdf() {
  const pdf = await PDFDocument.create();
  pdf.addPage([600, 800]);
  pdf.addPage([600, 800]);
  return pdf.save();
}

describe("PDF cropping", () => {
  it("sets a CropBox on only the selected pages", async () => {
    const output = await cropPdfPages(await sourcePdf(), { selectedPages: [1], top: 10, right: 20, bottom: 5, left: 10 });
    const pdf = await PDFDocument.load(output);
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getPage(0).getCropBox()).toMatchObject({ x: 0, y: 0, width: 600, height: 800 });
    expect(pdf.getPage(1).getCropBox()).toMatchObject({ x: 60, y: 40, width: 420, height: 680 });
  });

  it("rejects an empty or invalid crop selection", async () => {
    const source = await sourcePdf();
    await expect(cropPdfPages(source, { selectedPages: [] })).rejects.toThrow("Select at least one page");
    await expect(cropPdfPages(source, { selectedPages: [0], left: 45, right: 45 })).rejects.toThrow("Leave at least 10%");
  });
});

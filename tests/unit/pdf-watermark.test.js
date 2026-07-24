import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { addWatermarkToPdf } from "../../src/tools/pdfWatermark.js";

const onePixelPng = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="), (character) => character.charCodeAt(0));

async function sourcePdf() {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  pdf.addPage([612, 792]);
  return pdf.save();
}

describe("PDF watermarking", () => {
  it("adds a text watermark to a selected page without changing document pages", async () => {
    const source = await sourcePdf();
    const output = await addWatermarkToPdf(source, { text: "INTERNAL", selectedPages: [1], opacity: 0.4, rotation: -45, color: "#2851eb" });
    const pdf = await PDFDocument.load(output);
    expect(pdf.getPageCount()).toBe(2);
    expect(output.length).toBeGreaterThan(source.length);
  });

  it("adds tiled image watermarks and rejects invalid settings", async () => {
    const source = await sourcePdf();
    const output = await addWatermarkToPdf(source, { kind: "image", imageBytes: onePixelPng, imageMimeType: "image/png", selectedPages: [0, 1], layout: "tile", imageScale: 0.2 });
    expect((await PDFDocument.load(output)).getPageCount()).toBe(2);
    await expect(addWatermarkToPdf(source, { selectedPages: [] })).rejects.toThrow("Select at least one page");
    await expect(addWatermarkToPdf(source, { text: "", selectedPages: [0] })).rejects.toThrow("Enter watermark text");
  });
});

import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { addPdfLinkAnnotation } from "../../src/editor/pdfLinkAnnotation.mjs";

describe("PDF link annotations", () => {
  it("exports a clickable URI annotation with the expected page rectangle", async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([612, 792]);
    const result = addPdfLinkAnnotation(page, document, {
      x: 72,
      y: 680,
      width: 180,
      height: 24,
      url: "https://example.com/document",
    });

    expect(result).not.toBeNull();
    const reloaded = await PDFDocument.load(await document.save());
    expect(reloaded.getPage(0).node.Annots()?.size()).toBe(1);
  });

  it("does not create empty or zero-sized links", async () => {
    const document = await PDFDocument.create();
    const page = document.addPage();
    expect(addPdfLinkAnnotation(page, document, { x: 0, y: 0, width: 0, height: 20, url: "https://example.com" })).toBeNull();
    expect(page.node.Annots()).toBeUndefined();
  });
});

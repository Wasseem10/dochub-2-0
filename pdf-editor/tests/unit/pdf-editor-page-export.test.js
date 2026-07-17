import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { appendEditorPages } from "../../src/tools/pdfEditorPageExport.js";

describe("editor page export plan", () => {
  it("exports reordered, duplicated, rotated, and inserted pages as an openable PDF", async () => {
    const source = await PDFDocument.create();
    source.addPage([612, 792]);
    source.addPage([400, 500]);
    const sourceBytes = await source.save();
    const loadedSource = await PDFDocument.load(sourceBytes);
    const output = await PDFDocument.create();

    await appendEditorPages({
      pdfDoc: output,
      sourcePdf: loadedSource,
      pages: [
        { source: "pdf", originalIndex: 1, rotation: 90 },
        { source: "pdf", originalIndex: 0, rotation: 0 },
        { source: "pdf", originalIndex: 1, rotation: 90 },
        { source: "blank", width: 984, height: 760 },
      ],
      embedDataUrlImage: async () => null,
    });

    const reopened = await PDFDocument.load(await output.save());
    expect(reopened.getPageCount()).toBe(4);
    expect(reopened.getPages()[0].getRotation().angle).toBe(90);
    expect(reopened.getPages()[2].getRotation().angle).toBe(90);
    expect(reopened.getPages()[3].getWidth()).toBeGreaterThan(reopened.getPages()[3].getHeight());
  });
});

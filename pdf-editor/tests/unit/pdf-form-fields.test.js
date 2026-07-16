import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { extractPdfFormAnnotations } from "../../src/tools/pdfFormFields.js";

const standardFontDataUrl = new URL("../../node_modules/pdfjs-dist/standard_fonts/", import.meta.url).href;

const viewport = {
  width: 600,
  height: 800,
  convertToViewportRectangle(rect) {
    return [rect[0], 800 - rect[1], rect[2], 800 - rect[3]];
  },
};

describe("PDF form field detection", () => {
  it("maps text and checkbox widgets into editable page annotations", () => {
    let nextId = 0;
    const annotations = extractPdfFormAnnotations([
      { subtype: "Widget", rect: [60, 680, 300, 720], fieldName: "Full name", fieldType: "Tx", fieldValue: "Ada Lovelace", required: true },
      { subtype: "Widget", rect: [60, 620, 84, 644], fieldName: "Agree", fieldType: "Btn", fieldValue: "Yes" },
    ], viewport, 2, () => `form-${++nextId}`);

    expect(annotations).toHaveLength(2);
    expect(annotations[0]).toMatchObject({
      id: "form-1",
      type: "field",
      page: 2,
      fieldName: "Full name",
      content: "Ada Lovelace",
      required: true,
      source: "pdf-form",
    });
    expect(annotations[0].x).toBeCloseTo(0.1);
    expect(annotations[0].y).toBeCloseTo(0.1);
    expect(annotations[1]).toMatchObject({ type: "checkbox", fieldName: "Agree", checked: true });
  });

  it("ignores unsupported annotations and unchecked values", () => {
    const annotations = extractPdfFormAnnotations([
      { subtype: "Link", rect: [0, 0, 20, 20] },
      { subtype: "Widget", rect: [10, 10, 30, 30], fieldName: "Choice", fieldType: "Btn", fieldValue: "Off" },
    ], viewport, 0, () => "field-id");

    expect(annotations).toHaveLength(1);
    expect(annotations[0]).toMatchObject({ type: "checkbox", checked: false });
  });

  it("detects real AcroForm widgets created in a PDF", async () => {
    const source = await PDFDocument.create();
    const page = source.addPage([600, 800]);
    const form = source.getForm();
    const nameField = form.createTextField("full_name");
    nameField.setText("Grace Hopper");
    nameField.addToPage(page, { x: 60, y: 680, width: 240, height: 40 });
    const checkbox = form.createCheckBox("approved");
    checkbox.addToPage(page, { x: 60, y: 620, width: 24, height: 24 });
    checkbox.check();
    const bytes = await source.save();

    const loaded = await pdfjsLib.getDocument({ data: bytes.slice(0), disableWorker: true, standardFontDataUrl, verbosity: 0 }).promise;
    const pdfPage = await loaded.getPage(1);
    const viewportFromPdf = pdfPage.getViewport({ scale: 1 });
    const widgets = await pdfPage.getAnnotations({ intent: "display" });
    const annotations = extractPdfFormAnnotations(widgets, viewportFromPdf, 0, () => `form-${Math.random()}`);

    expect(annotations.some((annotation) => annotation.type === "field" && annotation.fieldName === "full_name" && annotation.content === "Grace Hopper")).toBe(true);
    expect(annotations.some((annotation) => annotation.type === "checkbox" && annotation.fieldName === "approved" && annotation.checked)).toBe(true);
  });
});

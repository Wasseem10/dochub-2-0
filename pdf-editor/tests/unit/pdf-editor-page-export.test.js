import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { appendEditorPages, applyNativePdfFormAnnotation, canPreserveNativePdfDocument, createEditorExportDocument } from "../../src/tools/pdfEditorPageExport.js";

const PNG_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function embedDataUrlImage(pdfDoc) {
  return pdfDoc.embedPng(Buffer.from(PNG_DATA_URL.split(",")[1], "base64"));
}

describe("editor page export plan", () => {
  it("keeps the original document catalog when source pages remain in place", async () => {
    const source = await PDFDocument.create();
    source.setTitle("Native fidelity source");
    source.setSubject("Preserve document metadata");
    const page = source.addPage([612, 792]);
    const form = source.getForm();
    const field = form.createTextField("customer.name");
    field.setText("Ada Lovelace");
    field.addToPage(page, { x: 50, y: 700, width: 180, height: 24 });
    const sourceBytes = await source.save();
    const loaded = await PDFDocument.load(sourceBytes);
    const pages = [{ source: "pdf", originalIndex: 0, rotation: 0 }];

    expect(canPreserveNativePdfDocument(loaded, pages)).toBe(true);
    const result = await createEditorExportDocument({ pdfBytes: sourceBytes, pages, embedDataUrlImage: async () => null });
    const reopened = await PDFDocument.load(await result.pdfDoc.save());

    expect(result.nativeSourcePreserved).toBe(true);
    expect(reopened.getTitle()).toBe("Native fidelity source");
    expect(reopened.getSubject()).toBe("Preserve document metadata");
    expect(reopened.getForm().getTextField("customer.name").getText()).toBe("Ada Lovelace");
  });

  it("rebuilds only when the user changes the native page plan", async () => {
    const source = await PDFDocument.create();
    source.addPage([612, 792]);
    const sourceBytes = await source.save();
    const result = await createEditorExportDocument({
      pdfBytes: sourceBytes,
      pages: [{ source: "pdf", originalIndex: 0, rotation: 90 }],
      embedDataUrlImage: async () => null,
    });
    expect(result.nativeSourcePreserved).toBe(false);
    expect(result.pdfDoc.getPages()[0].getRotation().angle).toBe(90);
  });

  it("replaces only changed native pages while retaining metadata and untouched form pages", async () => {
    const source = await PDFDocument.create();
    source.setTitle("Replacement fidelity source");
    source.addPage([612, 792]);
    const formPage = source.addPage([500, 700]);
    const name = source.getForm().createTextField("customer.name");
    name.setText("Ada Lovelace");
    name.addToPage(formPage, { x: 50, y: 600, width: 180, height: 24 });
    const sourceBytes = await source.save();
    const result = await createEditorExportDocument({
      pdfBytes: sourceBytes,
      pages: [
        { source: "pdf", originalIndex: 0, rotation: 0 },
        { source: "pdf", originalIndex: 1, rotation: 0 },
      ],
      rebuiltPages: new Map([[0, { image: PNG_DATA_URL, pdfWidth: 612, pdfHeight: 792 }]]),
      embedDataUrlImage,
    });
    const reopened = await PDFDocument.load(await result.pdfDoc.save());
    expect(Array.from(result.rebuiltPageIndexes)).toEqual([0]);
    expect(reopened.getTitle()).toBe("Replacement fidelity source");
    expect(reopened.getPageCount()).toBe(2);
    expect(reopened.getForm().getTextField("customer.name").getText()).toBe("Ada Lovelace");
  });

  it("updates native AcroForm values instead of painting duplicate flattened fields", async () => {
    const source = await PDFDocument.create();
    const page = source.addPage([612, 792]);
    const form = source.getForm();
    const name = form.createTextField("customer.name");
    name.addToPage(page, { x: 50, y: 700, width: 180, height: 24 });
    const approved = form.createCheckBox("customer.approved");
    approved.addToPage(page, { x: 50, y: 650, width: 18, height: 18 });
    const plan = form.createRadioGroup("customer.plan");
    plan.addOptionToPage("Basic", page, { x: 50, y: 610, width: 18, height: 18 });
    plan.addOptionToPage("Pro", page, { x: 80, y: 610, width: 18, height: 18 });
    const country = form.createDropdown("customer.country");
    country.addOptions(["US", "CA"]);
    country.addToPage(page, { x: 50, y: 560, width: 120, height: 24 });

    expect(applyNativePdfFormAnnotation(source, { source: "pdf-form", type: "field", fieldName: "customer.name", content: "Grace Hopper" })).toBe(true);
    expect(applyNativePdfFormAnnotation(source, { source: "pdf-form", type: "checkbox", fieldName: "customer.approved", checked: true })).toBe(true);
    expect(applyNativePdfFormAnnotation(source, { source: "pdf-form", type: "radio", fieldName: "customer.plan", selected: true, optionValue: "Pro" })).toBe(true);
    expect(applyNativePdfFormAnnotation(source, { source: "pdf-form", type: "choice", fieldName: "customer.country", content: "CA" })).toBe(true);
    const reopened = await PDFDocument.load(await source.save());
    expect(reopened.getForm().getTextField("customer.name").getText()).toBe("Grace Hopper");
    expect(reopened.getForm().getCheckBox("customer.approved").isChecked()).toBe(true);
    expect(reopened.getForm().getRadioGroup("customer.plan").getSelected()).toBe("Pro");
    expect(reopened.getForm().getDropdown("customer.country").getSelected()).toEqual(["CA"]);
  });

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

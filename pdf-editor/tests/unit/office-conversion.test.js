import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  createDocxFromPdfPages,
  createPdfFromRenderedDocxPages,
  groupPdfTextItems,
  validateOfficeConversionFile,
} from "../../src/tools/officeConversion.js";

const onePixelPng = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="), (character) => character.charCodeAt(0));

function mockFile(name, type, size = 128) {
  return { name, type, size };
}

describe("Office conversion primitives", () => {
  it("validates supported file types, size, and legacy Word files", () => {
    expect(validateOfficeConversionFile(mockFile("report.pdf", "application/pdf"), "pdf")).toBe("");
    expect(validateOfficeConversionFile(mockFile("report.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), "docx")).toBe("");
    expect(validateOfficeConversionFile(mockFile("report.doc", "application/msword"), "docx")).toContain("Legacy .doc files");
    expect(validateOfficeConversionFile(mockFile("huge.pdf", "application/pdf", 21 * 1024 * 1024), "pdf")).toContain("smaller than 20 MB");
  });

  it("groups positioned PDF text into reading-order lines", () => {
    const lines = groupPdfTextItems([
      { str: "world", transform: [1, 0, 0, 11, 42, 100], width: 28, height: 11 },
      { str: "Second line", transform: [1, 0, 0, 11, 10, 80], width: 60, height: 11 },
      { str: "Hello", transform: [1, 0, 0, 11, 10, 100], width: 28, height: 11 },
    ]);
    expect(lines.map((line) => line.text)).toEqual(["Hello world", "Second line"]);
  });

  it("creates a real editable DOCX package", async () => {
    const bytes = await createDocxFromPdfPages([{ lines: [{ text: "Quarterly report", fontSize: 18 }, { text: "Revenue increased.", fontSize: 11 }] }], { mode: "editable", title: "Report" });
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe("PK");
  });

  it("creates a visual DOCX package and a loadable PDF", async () => {
    const docxBytes = await createDocxFromPdfPages([{ imageBytes: onePixelPng, width: 612, height: 792, lines: [] }], { mode: "visual" });
    expect(String.fromCharCode(docxBytes[0], docxBytes[1])).toBe("PK");

    const pdfBytes = await createPdfFromRenderedDocxPages([{ bytes: onePixelPng }, { bytes: onePixelPng }], { title: "Two pages" });
    const pdf = await PDFDocument.load(pdfBytes);
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getTitle()).toBe("Two pages");
  });
});

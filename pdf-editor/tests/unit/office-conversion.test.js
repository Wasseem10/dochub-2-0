import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
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
    expect(lines[0]).toMatchObject({ x: 10, y: 100, width: 60 });
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

  it("adds a searchable text layer to visually rendered Word pages", async () => {
    const pdfBytes = await createPdfFromRenderedDocxPages([{
      bytes: onePixelPng,
      textItems: [
        { text: "Searchable", x: 0.1, y: 0.1, w: 0.12, h: 0.03 },
        { text: "document", x: 0.24, y: 0.1, w: 0.12, h: 0.03 },
      ],
    }]);
    const standardFontDataUrl = new URL("../../node_modules/pdfjs-dist/standard_fonts/", import.meta.url).toString();
    const renderedPdf = await pdfjsLib.getDocument({ data: pdfBytes, standardFontDataUrl }).promise;
    const textContent = await (await renderedPdf.getPage(1)).getTextContent();
    expect(textContent.items.map((item) => item.str.trim()).filter(Boolean)).toEqual(["Searchable", "document"]);
  });
});

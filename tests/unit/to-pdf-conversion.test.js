import PptxGenJS from "pptxgenjs";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { createXlsxFromPdfPages } from "../../src/tools/structuredPdfConversion.js";
import { createPdfFromPresentation, createPdfFromWorkbook, parsePptxPresentation, parseXlsxWorkbook, validateToPdfFile } from "../../src/tools/toPdfConversion.js";

describe("Office files to PDF", () => {
  it("parses XLSX values and produces paginated PDF tables", async () => {
    const xlsx = createXlsxFromPdfPages([{ name: "Revenue", rows: [["Quarter", "Total"], ["Q1", "42000"]] }]);
    const workbook = parseXlsxWorkbook(xlsx);
    expect(workbook.sheets[0]).toMatchObject({ name: "Revenue", rows: [["Quarter", "Total"], ["Q1", "42000"]] });
    const pdf = await PDFDocument.load(await createPdfFromWorkbook(workbook, { title: "Revenue" }));
    expect(pdf.getPageCount()).toBe(1);
  });

  it("parses common PPTX text and produces one PDF page per slide", async () => {
    const pptx = new PptxGenJS();
    pptx.addSlide().addText("Launch plan", { x: 1, y: 1, w: 5, h: 1, fontSize: 28, bold: true });
    pptx.addSlide().addText("Next milestone", { x: 1, y: 1, w: 5, h: 1, fontSize: 22 });
    const bytes = new Uint8Array(await pptx.write({ outputType: "arraybuffer" }));
    const presentation = parsePptxPresentation(bytes);
    expect(presentation.slides).toHaveLength(2);
    expect(presentation.slides[0].elements.some((element) => element.text.includes("Launch plan"))).toBe(true);
    const pdf = await PDFDocument.load(await createPdfFromPresentation(presentation));
    expect(pdf.getPageCount()).toBe(2);
  });

  it("rejects legacy and oversized source files honestly", () => {
    expect(validateToPdfFile({ name: "old.xls", size: 12, type: "application/vnd.ms-excel" }, "excel")).toContain("XLSX");
    expect(validateToPdfFile({ name: "huge.pptx", size: 21 * 1024 * 1024, type: "" }, "powerpoint")).toContain("20 MB");
  });
});

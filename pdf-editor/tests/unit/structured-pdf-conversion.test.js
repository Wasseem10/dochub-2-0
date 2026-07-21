import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  createPptxFromRenderedPages,
  createStandaloneHtmlFromPdfPages,
  createXlsxFromPdfPages,
  pdfTextItemsToRows,
  validateStructuredPdf,
} from "../../src/tools/structuredPdfConversion.js";

function mockFile(name, type, size = 1024) {
  return { name, type, size };
}

describe("structured PDF converters", () => {
  it("validates bounded PDF input", () => {
    expect(validateStructuredPdf(mockFile("report.pdf", "application/pdf"))).toBe("");
    expect(validateStructuredPdf(mockFile("report.txt", "text/plain"))).toMatch(/PDF file/);
    expect(validateStructuredPdf(mockFile("large.pdf", "application/pdf", 26 * 1024 * 1024))).toMatch(/25 MB/);
  });

  it("groups visual PDF lines into spreadsheet rows and cells", () => {
    const rows = pdfTextItemsToRows([
      { str: "Name", transform: [1, 0, 0, 10, 30, 700], width: 34, height: 10 },
      { str: "Amount", transform: [1, 0, 0, 10, 220, 700], width: 52, height: 10 },
      { str: "Hosting", transform: [1, 0, 0, 10, 30, 675], width: 48, height: 10 },
      { str: "$42", transform: [1, 0, 0, 10, 220, 675], width: 22, height: 10 },
    ]);
    expect(rows).toEqual([["Name", "Amount"], ["Hosting", "$42"]]);
  });

  it("creates an XLSX package with a worksheet per PDF page", () => {
    const workbook = unzipSync(createXlsxFromPdfPages([
      { name: "Page 1", rows: [["Name", "Amount"], ["Hosting", "$42"]] },
      { name: "Page 2", rows: [["Total", "$42"]] },
    ], { title: "Invoice" }));
    expect(Object.keys(workbook)).toContain("xl/workbook.xml");
    expect(Object.keys(workbook)).toContain("xl/worksheets/sheet2.xml");
    expect(strFromU8(workbook["xl/workbook.xml"])).toContain('name="Page 2"');
    expect(strFromU8(workbook["xl/worksheets/sheet1.xml"])).toContain("Hosting");
  });

  it("creates standalone responsive HTML with escaped selectable text", () => {
    const html = createStandaloneHtmlFromPdfPages([{ width: 612, height: 792, items: [{ text: "Revenue < Costs", x: 40, y: 80, fontSize: 12 }] }], { title: "Quarterly & Report" });
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Revenue &lt; Costs");
    expect(html).toContain("Quarterly &amp; Report");
    expect(html).toContain('viewBox="0 0 612 792"');
  });

  it("creates a valid PPTX package with one image slide per page", async () => {
    const transparentPixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Xf6vWQAAAABJRU5ErkJggg==";
    const bytes = await createPptxFromRenderedPages([
      { dataUrl: transparentPixel, width: 612, height: 792 },
      { dataUrl: transparentPixel, width: 612, height: 792 },
    ], { title: "Two pages" });
    const presentation = unzipSync(bytes);
    expect(Object.keys(presentation)).toContain("ppt/presentation.xml");
    expect(Object.keys(presentation)).toContain("ppt/slides/slide2.xml");
    expect(strFromU8(presentation["docProps/core.xml"])).toContain("Two pages");
  });
});

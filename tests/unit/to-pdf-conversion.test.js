import PptxGenJS from "pptxgenjs";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import { createXlsxFromPdfPages } from "../../src/tools/structuredPdfConversion.js";
import { createPdfFromPresentation, createPdfFromWorkbook, parsePptxPresentation, parseXlsxWorkbook, validateToPdfFile } from "../../src/tools/toPdfConversion.js";

async function pdfText(bytes) {
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0 });
  try {
    const document = await task.promise;
    const pages = [];
    for (let page = 1; page <= document.numPages; page += 1) {
      pages.push((await (await document.getPage(page)).getTextContent()).items.map((item) => item.str).join(" "));
    }
    return pages.join("\n");
  } finally {
    await task.destroy();
  }
}

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

  it("preserves accents, currency, punctuation, and metadata in spreadsheet PDFs", async () => {
    const workbook = parseXlsxWorkbook(createXlsxFromPdfPages([{ name: "Résumé", rows: [
      ["Nom", "Prix"], ["Café", "Coût: € 42"], ["François", "Total: £ 15"], ["“Été”—œuvre…", "Straße"], ["Cafe\u0301", "© 2026"],
    ] }]));
    const bytes = await createPdfFromWorkbook(workbook, { title: "Résumé" });
    const text = await pdfText(bytes);
    for (const expected of ["Résumé", "Café", "€ 42", "François", "£ 15", "“Été”—œuvre…", "Straße", "© 2026"]) expect(text).toContain(expected);
    expect((await PDFDocument.load(bytes)).getTitle()).toBe("Résumé");
  });

  it("preserves supported Unicode text in presentation PDFs", async () => {
    const pptx = new PptxGenJS();
    pptx.addSlide().addText("Résumé — Café € 42", { x: 1, y: 1, w: 8, h: 1, fontSize: 24, bold: true });
    const presentation = parsePptxPresentation(new Uint8Array(await pptx.write({ outputType: "arraybuffer" })));
    const bytes = await createPdfFromPresentation(presentation, { title: "Résumé 東京" });
    expect(await pdfText(bytes)).toContain("Résumé — Café € 42");
    expect((await PDFDocument.load(bytes)).getTitle()).toBe("Résumé 東京");
  });

  it("refuses unsupported text instead of producing substituted spreadsheet or slide content", async () => {
    const workbook = { sheets: [{ name: "Data", rows: [["東京"]] }] };
    await expect(createPdfFromWorkbook(workbook)).rejects.toThrow(/cannot preserve/);
    const presentation = { width: 960, height: 540, slides: [{ elements: [{ type: "shape", text: "東京", x: 0, y: 0, width: 600, height: 100, size: 24 }] }] };
    await expect(createPdfFromPresentation(presentation)).rejects.toThrow(/cannot preserve/);
  });
});

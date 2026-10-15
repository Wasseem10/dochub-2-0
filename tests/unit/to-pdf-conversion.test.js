import PptxGenJS from "pptxgenjs";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import { createXlsxFromPdfPages } from "../../src/tools/structuredPdfConversion.js";
import { formattedValues, formattedXlsx } from "../fixtures/xlsx-number-formats.mjs";
import { longCellNotes, longCellReference, longCellsXlsx } from "../fixtures/xlsx-long-cells.mjs";
import { limitsXlsx } from "../fixtures/xlsx-limits.mjs";
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

async function tableColumnText(bytes, x) {
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0 });
  try {
    const document = await task.promise;
    const lines = [];
    for (let number = 1; number <= document.numPages; number += 1) {
      const content = await (await document.getPage(number)).getTextContent();
      lines.push(...content.items.filter((item) => Math.abs(item.transform[4] - x) < 1 && Math.abs(item.height - 8.5) < 0.1).map((item) => item.str));
    }
    return lines.join("").replace(/\s/g, "");
  } finally {
    await task.destroy();
  }
}

describe("Office files to PDF", () => {
  it.each([
    [{ sheets: 31 }, "30 worksheets"],
    [{ rows: 2501 }, "2500 rows per worksheet"],
    [{ columns: 121 }, "120 columns per worksheet"],
    [{ columns: 500 }, "120 columns per worksheet"],
  ])("refuses oversized workbook %j before returning partial or overwritten cells", (options, message) => {
    expect(() => parseXlsxWorkbook(limitsXlsx(options))).toThrow(message);
  });

  it("accepts workbook limits inclusively without dropping edge values", () => {
    const sheets = parseXlsxWorkbook(limitsXlsx({ sheets: 30 }));
    expect(sheets.sheets).toHaveLength(30);
    expect(sheets.sheets[29].rows).toEqual([["ROW 1"]]);
    const rows = parseXlsxWorkbook(limitsXlsx({ rows: 2500 }));
    expect(rows.sheets[0].rows).toHaveLength(2500);
    expect(rows.sheets[0].rows[2499]).toEqual(["ROW 2500"]);
    const columns = parseXlsxWorkbook(limitsXlsx({ columns: 120 }));
    expect(columns.sheets[0].rows[0]).toHaveLength(120);
    expect(columns.sheets[0].rows[0].slice(-2)).toEqual(["PREVIOUS COLUMN", "FINAL COLUMN"]);
    expect(columns.truncated).toBe(false);
  });

  it("retains long spreadsheet cells, including unbroken values, across PDF pages", async () => {
    const workbook = parseXlsxWorkbook(longCellsXlsx());
    const bytes = await createPdfFromWorkbook(workbook);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
    expect(await tableColumnText(bytes, 40)).toBe(`Notes${longCellNotes}Last row`.replace(/\s/g, ""));
    expect(await tableColumnText(bytes, 194)).toBe(`Reference${longCellReference}REF 00042`.replace(/\s/g, ""));
  });

  it("wraps explicit line breaks and keeps following rows separate", async () => {
    const bytes = await createPdfFromWorkbook({ sheets: [{ name: "Rows", rows: [["Header"], ["First line\nSecond line"], ["Following row"]] }] });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
    const task = pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0 });
    try {
      const content = await (await (await task.promise).getPage(1)).getTextContent();
      const first = content.items.find((item) => item.str === "First line");
      const second = content.items.find((item) => item.str === "Second line");
      const following = content.items.find((item) => item.str === "Following row");
      expect(first.transform[5] - second.transform[5]).toBe(12);
      expect(second.transform[5] - following.transform[5]).toBeGreaterThanOrEqual(12);
    } finally {
      await task.destroy();
    }
  });

  it("retains numeric display formats instead of exposing raw stored values", async () => {
    const workbook = parseXlsxWorkbook(formattedXlsx());
    expect(workbook.sheets[0].rows.slice(1).map((row) => row[1])).toEqual(formattedValues);
    const bytes = await createPdfFromWorkbook(workbook, { title: "Formats" });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
    const text = await pdfText(bytes);
    for (const value of formattedValues.filter(Boolean)) expect(text).toContain(value);
  });

  it("honors the workbook date system and keeps custom formats local to each file", () => {
    expect(parseXlsxWorkbook(formattedXlsx({ date1904: true })).sheets[0].rows[1][1]).toBe("2024-01-01");
    expect(parseXlsxWorkbook(formattedXlsx({ currency: "£" })).sheets[0].rows[4][1]).toBe("£1,234.50");
    expect(parseXlsxWorkbook(formattedXlsx()).sheets[0].rows[4][1]).toBe("€1,234.50");
  });

  it("stops with a safe error for invalid or missing number formats", () => {
    expect(() => parseXlsxWorkbook(formattedXlsx({ currencyFormat: "invalid-private-format" }))).toThrow("This spreadsheet contains a number format PDFEnrich cannot preserve.");
    const files = unzipSync(formattedXlsx());
    files["xl/styles.xml"] = strToU8(strFromU8(files["xl/styles.xml"]).replace('numFmtId="166" formatCode=', 'numFmtId="168" formatCode='));
    expect(() => parseXlsxWorkbook(zipSync(files))).toThrow(/cannot preserve/);
    files["xl/worksheets/sheet1.xml"] = strToU8(strFromU8(files["xl/worksheets/sheet1.xml"]).replace('s="1"', 's="99"'));
    expect(() => parseXlsxWorkbook(zipSync(files))).toThrow(/cannot preserve/);
  });

  it("parses XLSX values and produces paginated PDF tables", async () => {
    const xlsx = createXlsxFromPdfPages([{ name: "Revenue", rows: [["Quarter", "Total"], ["Q1", "42000"]] }]);
    const workbook = parseXlsxWorkbook(xlsx);
    expect(workbook.sheets[0]).toMatchObject({ name: "Revenue", rows: [["Quarter", "Total"], ["Q1", "42,000.00"]] });
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

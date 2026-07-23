import { strToU8, zipSync } from "fflate";

export const STRUCTURED_CONVERSION_LIMITS = Object.freeze({
  maxBytes: 25 * 1024 * 1024,
  maxPages: 100,
  maxRenderedPixels: 18_000_000,
});

export function validateStructuredPdf(file) {
  if (!file) return "Choose a PDF to continue.";
  if (!file.size) return "This PDF is empty.";
  if (file.size > STRUCTURED_CONVERSION_LIMITS.maxBytes) return "Choose a PDF no larger than 25 MB.";
  if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name || "")) return "Choose a PDF file.";
  return "";
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function columnName(index) {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
}

function uniqueSheetName(value, usedNames) {
  const base = String(value || "Page").replace(/[\\/*?:[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, 31) || "Page";
  let name = base;
  let suffix = 2;
  while (usedNames.has(name.toLowerCase())) {
    const marker = ` ${suffix}`;
    name = `${base.slice(0, 31 - marker.length)}${marker}`;
    suffix += 1;
  }
  usedNames.add(name.toLowerCase());
  return name;
}

function normalizePdfTextItems(items) {
  const normalized = (items || [])
    .filter((item) => String(item.str || "").trim())
    .map((item) => ({
      text: String(item.str).replace(/\s+/g, " ").trim(),
      x: Number(item.transform?.[4] || 0),
      y: Number(item.transform?.[5] || 0),
      width: Math.max(0, Number(item.width || 0)),
      height: Math.max(4, Number(item.height || Math.abs(item.transform?.[3]) || 10)),
    }))
    .sort((a, b) => (b.y - a.y) || (a.x - b.x));

  return normalized;
}

export function pdfTextItemsToTable(items) {
  const normalized = normalizePdfTextItems(items);
  const lines = [];
  normalized.forEach((item) => {
    const tolerance = Math.max(2.5, item.height * 0.45);
    const line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= Math.max(tolerance, candidate.height * 0.45));
    if (line) {
      line.items.push(item);
      line.y = line.items.reduce((total, entry) => total + entry.y, 0) / line.items.length;
      line.height = Math.max(line.height, item.height);
    } else {
      lines.push({ y: item.y, height: item.height, items: [item] });
    }
  });

  const visualRows = lines
    .sort((a, b) => b.y - a.y)
    .map((line) => {
      const cells = [];
      line.items.sort((a, b) => a.x - b.x).forEach((item) => {
        const previous = cells[cells.length - 1];
        const gap = previous ? item.x - previous.endX : 0;
        const newCellGap = Math.max(18, line.height * 2.4);
        if (!previous || gap > newCellGap) {
          cells.push({ text: item.text, x: item.x, endX: item.x + item.width, height: item.height });
        } else {
          previous.text = `${previous.text}${gap > 1 ? " " : ""}${item.text}`;
          previous.endX = Math.max(previous.endX, item.x + item.width);
        }
      });
      return cells;
    })
    .filter((row) => row.some((cell) => cell.text));

  const candidates = visualRows.flatMap((row) => row.map((cell) => cell.x)).sort((a, b) => a - b);
  const anchors = [];
  candidates.forEach((x) => {
    const nearest = anchors.find((anchor) => Math.abs(anchor.x - x) <= 16);
    if (nearest) {
      nearest.values.push(x);
      nearest.x = nearest.values.reduce((total, value) => total + value, 0) / nearest.values.length;
    } else {
      anchors.push({ x, values: [x] });
    }
  });
  anchors.sort((a, b) => a.x - b.x);

  const rows = visualRows.map((row) => {
    const output = [];
    row.forEach((cell) => {
      let column = anchors.reduce((best, anchor, index) => (
        Math.abs(anchor.x - cell.x) < Math.abs(anchors[best].x - cell.x) ? index : best
      ), 0);
      while (output[column]) column += 1;
      output[column] = cell.text;
    });
    return Array.from({ length: output.length }, (_, index) => output[index] || "");
  });
  return { rows, columns: anchors.map((anchor) => anchor.x) };
}

export function pdfTextItemsToRows(items) {
  return pdfTextItemsToTable(items).rows;
}

export function ocrWordsToPdfTextItems(words, _imageWidth, imageHeight) {
  const height = Math.max(1, Number(imageHeight) || 1);
  return (words || []).map((word) => ({
    str: String(word.text || ""),
    transform: [1, 0, 0, Math.max(4, word.bbox.y1 - word.bbox.y0), word.bbox.x0, height - word.bbox.y1],
    width: Math.max(0, word.bbox.x1 - word.bbox.x0),
    height: Math.max(4, word.bbox.y1 - word.bbox.y0),
  }));
}

function inferredCell(value) {
  const text = String(value ?? "").trim();
  if (!text) return { kind: "empty", value: "" };
  if (/^0\d+$/.test(text)) return { kind: "string", value: text };
  const percent = text.match(/^\(?\s*([+-]?[\d,.]+(?:\.\d+)?)\s*%\s*\)?$/);
  if (percent) return { kind: "percent", value: Number(percent[1].replaceAll(",", "")) / 100 };
  const currency = text.match(/^\(?\s*([$\u20ac\u00a3\u00a5])\s*([+-]?[\d,.]+(?:\.\d+)?)\s*\)?$/);
  if (currency) {
    const value = Number(currency[2].replaceAll(",", "")) * (text.startsWith("(") ? -1 : 1);
    return { kind: "currency", value };
  }
  if (/^[+-]?[\d,.]+(?:\.\d+)?$/.test(text) && Number.isFinite(Number(text.replaceAll(",", "")))) {
    return { kind: "number", value: Number(text.replaceAll(",", "")) };
  }
  const dateMatch = text.match(/^(\d{1,4})[-/](\d{1,2})[-/](\d{1,4})$/);
  if (dateMatch) {
    const first = Number(dateMatch[1]);
    const second = Number(dateMatch[2]);
    const third = Number(dateMatch[3]);
    const year = first > 1900 ? first : third;
    const month = first > 1900 ? second : first;
    const day = first > 1900 ? third : second;
    const utc = Date.UTC(year, month - 1, day);
    if (year >= 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31 && Number.isFinite(utc)) {
      return { kind: "date", value: Math.floor(utc / 86400000) + 25569 };
    }
  }
  return { kind: "string", value: text };
}

export function createXlsxFromPdfPages(pages, { title = "PDF export" } = {}) {
  if (!pages?.length) throw new Error("No PDF pages were available for Excel conversion.");
  const usedNames = new Set();
  const sheets = pages.map((page, index) => ({
    name: uniqueSheetName(page.name || `Page ${index + 1}`, usedNames),
    rows: Array.isArray(page.rows) ? page.rows : [],
  }));
  const files = {};
  const xml = (value) => strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${value}`);

  files["[Content_Types].xml"] = xml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
  files["_rels/.rels"] = xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  files["docProps/core.xml"] = xml(`<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(title)}</dc:title><dc:creator>FixThatPDF</dc:creator><cp:lastModifiedBy>FixThatPDF</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${new Date(0).toISOString()}</dcterms:created></cp:coreProperties>`);
  files["docProps/app.xml"] = xml(`<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>FixThatPDF</Application><Sheets>${sheets.length}</Sheets></Properties>`);
  files["xl/workbook.xml"] = xml(`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets></workbook>`);
  files["xl/_rels/workbook.xml.rels"] = xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  files["xl/styles.xml"] = xml(`<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="3"><numFmt numFmtId="164" formatCode="0.00%"/><numFmt numFmtId="165" formatCode="[$$-409]#,##0.00;[Red]-[$$-409]#,##0.00"/><numFmt numFmtId="166" formatCode="mmm d, yyyy"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Arial"/><family val="2"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Arial"/><family val="2"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2851EB"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);

  sheets.forEach((sheet, sheetIndex) => {
    const maxColumns = Math.max(1, ...sheet.rows.map((row) => row.length));
    const headerIndex = sheet.rows.findIndex((row) => row.filter((cell) => String(cell || "").trim()).length >= 2 && row.every((cell) => !String(cell || "").trim() || inferredCell(cell).kind === "string"));
    const widths = Array.from({ length: maxColumns }, (_, columnIndex) => Math.max(10, Math.min(44, sheet.rows.reduce((maximum, row) => Math.max(maximum, String(row[columnIndex] ?? "").length + 2), 0))));
    const rowsXml = sheet.rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((cell, columnIndex) => {
      const inferred = inferredCell(cell);
      if (inferred.kind === "empty") return "";
      const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
      if (rowIndex === headerIndex) return `<c r="${reference}" s="5" t="inlineStr"><is><t xml:space="preserve">${escapeXml(inferred.value)}</t></is></c>`;
      const style = { number: 1, percent: 2, currency: 3, date: 4 }[inferred.kind];
      if (style) return `<c r="${reference}" s="${style}"><v>${inferred.value}</v></c>`;
      return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(inferred.value)}</t></is></c>`;
    }).join("")}</row>`).join("");
    const headerRow = headerIndex >= 0 ? headerIndex + 1 : 0;
    const views = headerRow ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRow}" topLeftCell="A${headerRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` : `<sheetViews><sheetView workbookViewId="0"/></sheetViews>`;
    const autoFilter = headerRow && sheet.rows.length > headerRow ? `<autoFilter ref="A${headerRow}:${columnName(maxColumns - 1)}${sheet.rows.length}"/>` : "";
    files[`xl/worksheets/sheet${sheetIndex + 1}.xml`] = xml(`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${columnName(maxColumns - 1)}${Math.max(1, sheet.rows.length)}"/>${views}<sheetFormatPr defaultRowHeight="15"/><cols>${widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("")}</cols><sheetData>${rowsXml}</sheetData>${autoFilter}</worksheet>`);
  });
  return zipSync(files, { level: 6 });
}

export function createStandaloneHtmlFromPdfPages(pages, { title = "PDF export" } = {}) {
  if (!pages?.length) throw new Error("No PDF pages were available for HTML conversion.");
  const body = pages.map((page, pageIndex) => {
    const width = Math.max(1, Number(page.width || 612));
    const height = Math.max(1, Number(page.height || 792));
    const text = (page.items || []).map((item) => `<text x="${Number(item.x || 0).toFixed(2)}" y="${Number(item.y || 0).toFixed(2)}" font-size="${Math.max(4, Number(item.fontSize || 10)).toFixed(2)}" font-family="${escapeHtml(item.fontFamily || "Arial, sans-serif")}" fill="#111827">${escapeHtml(item.text)}</text>`).join("");
    return `<section class="pdf-page" aria-label="Page ${pageIndex + 1}"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="PDF page ${pageIndex + 1}" preserveAspectRatio="xMidYMid meet"><rect width="100%" height="100%" fill="white"/>${text}</svg></section>`;
  }).join("\n");
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>*{box-sizing:border-box}body{margin:0;padding:32px;background:#eef2f7;color:#111827;font-family:Arial,sans-serif}.pdf-document{display:grid;gap:24px;justify-items:center}.pdf-page{width:min(100%,900px);background:#fff;box-shadow:0 12px 36px rgba(15,23,42,.16)}.pdf-page svg{display:block;width:100%;height:auto}text{white-space:pre}@media(max-width:640px){body{padding:12px}.pdf-document{gap:12px}}@media print{body{padding:0;background:#fff}.pdf-document{gap:0}.pdf-page{width:100%;box-shadow:none;break-after:page}}</style></head><body><main class="pdf-document" aria-label="${escapeHtml(title)}">${body}</main></body></html>`;
}

export async function createPptxFromRenderedPages(pages, { title = "PDF presentation" } = {}) {
  if (!pages?.length) throw new Error("No PDF pages were available for PowerPoint conversion.");
  const module = await import("pptxgenjs");
  const PptxGenJS = module.default;
  const presentation = new PptxGenJS();
  const firstWidth = Math.max(1, Number(pages[0].width));
  const firstHeight = Math.max(1, Number(pages[0].height));
  const firstRatio = firstWidth / firstHeight;
  const slideWidth = firstRatio >= 1 ? 13.333 : 7.5;
  const slideHeight = slideWidth / firstRatio;
  presentation.defineLayout({ name: "FIXTHATPDF_SOURCE", width: slideWidth, height: slideHeight });
  presentation.layout = "FIXTHATPDF_SOURCE";
  presentation.author = "FixThatPDF";
  presentation.subject = "PDF pages converted to PowerPoint slides";
  presentation.title = String(title || "PDF presentation").slice(0, 120);
  presentation.company = "FixThatPDF";
  presentation.lang = "en-US";
  presentation.theme = { headFontFace: "Arial", bodyFontFace: "Arial", lang: "en-US" };

  pages.forEach((page, index) => {
    const pageRatio = Math.max(1, Number(page.width)) / Math.max(1, Number(page.height));
    let width = slideWidth;
    let height = width / pageRatio;
    if (height > slideHeight) {
      height = slideHeight;
      width = height * pageRatio;
    }
    const slide = presentation.addSlide();
    slide.background = { color: "FFFFFF" };
    slide.addImage({ data: page.dataUrl, x: (slideWidth - width) / 2, y: (slideHeight - height) / 2, w: width, h: height, altText: `PDF page ${index + 1}` });
  });

  const output = await presentation.write({ outputType: "arraybuffer", compression: true });
  return new Uint8Array(output);
}

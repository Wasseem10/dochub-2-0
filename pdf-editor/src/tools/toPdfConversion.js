import { strFromU8, unzipSync } from "fflate";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const TO_PDF_LIMITS = Object.freeze({
  maxInputBytes: 20 * 1024 * 1024,
  maxExpandedBytes: 120 * 1024 * 1024,
  maxSheets: 30,
  maxRowsPerSheet: 2500,
  maxColumnsPerSheet: 120,
  maxSlides: 100,
});

const MIME_TYPES = Object.freeze({
  excel: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  powerpoint: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  html: ["text/html", "application/xhtml+xml"],
});

export function validateToPdfFile(file, kind) {
  if (!file) return "Choose a file to continue.";
  if (!file.size) return "This file is empty.";
  if (file.size > TO_PDF_LIMITS.maxInputBytes) return "Choose a file no larger than 20 MB.";
  const name = String(file.name || "").toLowerCase();
  const extensions = kind === "excel" ? [".xlsx"] : kind === "powerpoint" ? [".pptx"] : [".html", ".htm"];
  if (!extensions.some((extension) => name.endsWith(extension)) && !MIME_TYPES[kind]?.includes(file.type)) {
    const label = kind === "excel" ? "XLSX" : kind === "powerpoint" ? "PPTX" : "HTML";
    return `Choose a ${label} file.`;
  }
  return "";
}

function archiveFiles(input, prefix) {
  let expandedBytes = 0;
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  try {
    return unzipSync(bytes, {
      filter(file) {
        expandedBytes += file.originalSize;
        if (expandedBytes > TO_PDF_LIMITS.maxExpandedBytes || file.originalSize > 40 * 1024 * 1024) {
          throw new Error("This Office file expands beyond the safe browser limit.");
        }
        return file.name.startsWith(prefix) || file.name === "[Content_Types].xml";
      },
    });
  } catch (error) {
    if (String(error?.message || "").includes("safe browser limit")) throw error;
    throw new Error("This file is not a valid browser-readable Office document.");
  }
}

function decodeXml(bytes) {
  return bytes ? strFromU8(bytes) : "";
}

function attributes(source = "") {
  const result = {};
  for (const match of source.matchAll(/([\w:.-]+)\s*=\s*(["'])([\s\S]*?)\2/g)) result[match[1]] = decodeEntities(match[3]);
  return result;
}

function decodeEntities(value = "") {
  return String(value)
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&")
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([\da-f]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)));
}

function elementBodies(xml, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...String(xml || "").matchAll(new RegExp(`<${escaped}\\b([^>]*)>([\\s\\S]*?)<\\/${escaped}>`, "g"))]
    .map((match) => ({ attrs: attributes(match[1]), body: match[2], index: match.index || 0, xml: match[0] }));
}

function relationships(xml) {
  const map = new Map();
  for (const match of String(xml || "").matchAll(/<Relationship\b([^>]*)\/?>(?:<\/Relationship>)?/g)) {
    const attrs = attributes(match[1]);
    if (attrs.Id && attrs.Target) map.set(attrs.Id, attrs.Target);
  }
  return map;
}

function normalizeArchivePath(base, target) {
  if (target.startsWith("/")) return target.slice(1);
  const parts = `${base}/${target}`.split("/");
  const normalized = [];
  parts.forEach((part) => {
    if (!part || part === ".") return;
    if (part === "..") normalized.pop();
    else normalized.push(part);
  });
  return normalized.join("/");
}

function cellColumnIndex(reference = "A1") {
  const letters = String(reference).match(/^[A-Z]+/i)?.[0]?.toUpperCase() || "A";
  return [...letters].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function inlineText(xml) {
  return elementBodies(xml, "t").map((entry) => decodeEntities(entry.body.replace(/<[^>]+>/g, ""))).join("");
}

export function parseXlsxWorkbook(input) {
  const files = archiveFiles(input, "xl/");
  const workbookXml = decodeXml(files["xl/workbook.xml"]);
  if (!workbookXml) throw new Error("This XLSX file does not contain a workbook.");
  const workbookRels = relationships(decodeXml(files["xl/_rels/workbook.xml.rels"]));
  const sharedStrings = elementBodies(decodeXml(files["xl/sharedStrings.xml"]), "si").map((entry) => inlineText(entry.body));
  const allSheetMatches = [...workbookXml.matchAll(/<sheet\b([^>]*)\/?>(?:<\/sheet>)?/g)];
  const sheetMatches = allSheetMatches.slice(0, TO_PDF_LIMITS.maxSheets);
  if (!sheetMatches.length) throw new Error("No worksheets were found in this XLSX file.");

  const sheets = sheetMatches.map((match, sheetIndex) => {
    const sheetAttrs = attributes(match[1]);
    const target = workbookRels.get(sheetAttrs["r:id"]);
    const path = target ? normalizeArchivePath("xl", target) : `xl/worksheets/sheet${sheetIndex + 1}.xml`;
    const sheetXml = decodeXml(files[path]);
    const rows = [];
    for (const row of elementBodies(sheetXml, "row").slice(0, TO_PDF_LIMITS.maxRowsPerSheet)) {
      const values = [];
      for (const cell of elementBodies(row.body, "c")) {
        const column = Math.min(TO_PDF_LIMITS.maxColumnsPerSheet - 1, cellColumnIndex(cell.attrs.r));
        const rawValue = elementBodies(cell.body, "v")[0]?.body || "";
        let value = cell.attrs.t === "inlineStr" ? inlineText(cell.body) : decodeEntities(rawValue.replace(/<[^>]+>/g, ""));
        if (cell.attrs.t === "s") value = sharedStrings[Number(value)] ?? "";
        if (cell.attrs.t === "b") value = value === "1" ? "TRUE" : "FALSE";
        values[column] = value;
      }
      while (values.length && values.at(-1) == null) values.pop();
      rows.push(values.map((value) => value == null ? "" : String(value)));
    }
    return { name: sheetAttrs.name || `Sheet ${sheetIndex + 1}`, rows };
  });
  return { sheets, truncated: allSheetMatches.length > TO_PDF_LIMITS.maxSheets };
}

function pdfText(value) {
  return String(value ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\n]/g, "?");
}

function fitText(value, width, font, size) {
  const text = pdfText(value).replace(/\s+/g, " ").trim();
  if (!text || font.widthOfTextAtSize(text, size) <= width) return text;
  let low = 0;
  let high = text.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (font.widthOfTextAtSize(`${text.slice(0, middle)}...`, size) <= width) low = middle;
    else high = middle - 1;
  }
  return `${text.slice(0, Math.max(0, low))}...`;
}

export async function createPdfFromWorkbook(workbook, { title = "Spreadsheet" } = {}) {
  if (!workbook?.sheets?.length) throw new Error("No spreadsheet sheets were available for conversion.");
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 36;
  const tableWidth = pageWidth - margin * 2;

  workbook.sheets.forEach((sheet) => {
    const columnCount = Math.max(1, ...sheet.rows.map((row) => row.length));
    const widths = Array.from({ length: columnCount }, (_, column) => {
      const maxLength = Math.max(5, ...sheet.rows.slice(0, 150).map((row) => String(row[column] ?? "").length));
      return Math.max(64, Math.min(154, maxLength * 6.1 + 18));
    });
    const groups = [];
    for (let start = 0; start < columnCount;) {
      let end = start;
      let total = 0;
      while (end < columnCount && (total + widths[end] <= tableWidth || end === start)) total += widths[end++];
      groups.push({ start, end, total });
      start = end;
    }
    const sourceRows = sheet.rows.length ? sheet.rows : [["This worksheet is empty."]];
    const rowsPerPage = 22;
    groups.forEach((group, groupIndex) => {
      for (let rowStart = 0; rowStart < sourceRows.length; rowStart += rowsPerPage) {
        const page = pdf.addPage([pageWidth, pageHeight]);
        page.drawText(pdfText(sheet.name), { x: margin, y: pageHeight - 34, size: 17, font: bold, color: rgb(0.08, 0.13, 0.25) });
        page.drawText(`Columns ${group.start + 1}-${group.end}${groups.length > 1 ? ` · section ${groupIndex + 1} of ${groups.length}` : ""}`, { x: margin, y: pageHeight - 51, size: 8, font: regular, color: rgb(0.38, 0.44, 0.55) });
        let y = pageHeight - 76;
        const scale = Math.min(1, tableWidth / Math.max(1, group.total));
        const visibleWidths = widths.slice(group.start, group.end).map((width) => width * scale);
        const pageRows = sourceRows.slice(rowStart, rowStart + rowsPerPage);
        pageRows.forEach((row, rowOffset) => {
          const rowHeight = 21;
          let x = margin;
          if (rowStart === 0 && rowOffset === 0) page.drawRectangle({ x, y: y - 4, width: visibleWidths.reduce((sum, width) => sum + width, 0), height: rowHeight, color: rgb(0.9, 0.93, 1) });
          visibleWidths.forEach((width, visibleColumn) => {
            page.drawRectangle({ x, y: y - 4, width, height: rowHeight, borderWidth: 0.5, borderColor: rgb(0.75, 0.79, 0.86) });
            const font = rowStart === 0 && rowOffset === 0 ? bold : regular;
            page.drawText(fitText(row[group.start + visibleColumn] ?? "", width - 8, font, 8.5), { x: x + 4, y: y + 3, size: 8.5, font, color: rgb(0.08, 0.12, 0.2) });
            x += width;
          });
          y -= rowHeight;
        });
        page.drawText(`FixThatPDF · ${title}`, { x: margin, y: 18, size: 7.5, font: regular, color: rgb(0.48, 0.53, 0.62) });
      }
    });
  });
  pdf.setTitle(pdfText(title));
  pdf.setCreator("FixThatPDF");
  pdf.setProducer("FixThatPDF browser spreadsheet conversion");
  return pdf.save();
}

function colorFromXml(xml, fallback = "FFFFFF") {
  return String(xml || "").match(/<a:srgbClr\b[^>]*\bval=["']([0-9A-F]{6})["']/i)?.[1] || fallback;
}

function rgbFromHex(value, fallback = rgb(1, 1, 1)) {
  if (!/^[0-9A-F]{6}$/i.test(value || "")) return fallback;
  return rgb(Number.parseInt(value.slice(0, 2), 16) / 255, Number.parseInt(value.slice(2, 4), 16) / 255, Number.parseInt(value.slice(4, 6), 16) / 255);
}

function shapeBounds(xml) {
  const xfrm = String(xml || "").match(/<a:xfrm\b[^>]*>([\s\S]*?)<\/a:xfrm>/)?.[1] || "";
  const offset = attributes(xfrm.match(/<a:off\b([^>]*)\/?\s*>/)?.[1]);
  const extent = attributes(xfrm.match(/<a:ext\b([^>]*)\/?\s*>/)?.[1]);
  return { x: Number(offset.x || 0), y: Number(offset.y || 0), width: Number(extent.cx || 0), height: Number(extent.cy || 0) };
}

function slideText(xml) {
  const paragraphs = elementBodies(xml, "a:p");
  const text = paragraphs.map((paragraph) => elementBodies(paragraph.body, "a:t").map((entry) => decodeEntities(entry.body.replace(/<[^>]+>/g, ""))).join("")).filter(Boolean).join("\n");
  const runProps = String(xml || "").match(/<a:(?:rPr|defRPr)\b([^>]*)/)?.[1] || "";
  const props = attributes(runProps);
  return { text, size: Math.max(8, Number(props.sz || 1800) / 100), bold: props.b === "1" || props.b === "true", color: colorFromXml(xml, "172033") };
}

export function parsePptxPresentation(input) {
  const files = archiveFiles(input, "ppt/");
  const presentationXml = decodeXml(files["ppt/presentation.xml"]);
  if (!presentationXml) throw new Error("This PPTX file does not contain a presentation.");
  const dimensions = attributes(presentationXml.match(/<p:sldSz\b([^>]*)\/?\s*>/)?.[1]);
  const width = Number(dimensions.cx || 12_192_000);
  const height = Number(dimensions.cy || 6_858_000);
  const presentationRels = relationships(decodeXml(files["ppt/_rels/presentation.xml.rels"]));
  const slideIds = [...presentationXml.matchAll(/<p:sldId\b([^>]*)\/?\s*>/g)].map((match) => attributes(match[1])["r:id"]);
  if (!slideIds.length) throw new Error("No slides were found in this PPTX file.");
  if (slideIds.length > TO_PDF_LIMITS.maxSlides) throw new Error(`PowerPoint conversion supports up to ${TO_PDF_LIMITS.maxSlides} slides.`);

  const slides = slideIds.map((relationshipId, index) => {
    const target = presentationRels.get(relationshipId) || `slides/slide${index + 1}.xml`;
    const slidePath = normalizeArchivePath("ppt", target);
    const slideXml = decodeXml(files[slidePath]);
    const slideFileName = slidePath.split("/").at(-1);
    const slideRels = relationships(decodeXml(files[`ppt/slides/_rels/${slideFileName}.rels`]));
    const elements = [];
    for (const shape of elementBodies(slideXml, "p:sp")) {
      const text = slideText(shape.body);
      const geometry = shape.body.match(/<a:prstGeom\b[^>]*\bprst=["']([^"']+)/)?.[1] || "rect";
      const shapeProperties = elementBodies(shape.body, "p:spPr")[0]?.body || "";
      elements.push({ type: "shape", ...shapeBounds(shape.body), ...text, geometry, fill: colorFromXml(shapeProperties, "FFFFFF"), index: shape.index });
    }
    for (const picture of elementBodies(slideXml, "p:pic")) {
      const relationship = picture.body.match(/<a:blip\b[^>]*\br:embed=["']([^"']+)/)?.[1];
      const mediaTarget = relationship ? slideRels.get(relationship) : "";
      const mediaPath = mediaTarget ? normalizeArchivePath("ppt/slides", mediaTarget) : "";
      elements.push({ type: "image", ...shapeBounds(picture.body), bytes: files[mediaPath], mediaPath, index: picture.index });
    }
    return { background: colorFromXml(elementBodies(slideXml, "p:bg")[0]?.body, "FFFFFF"), elements: elements.sort((a, b) => a.index - b.index) };
  });
  return { width, height, slides };
}

export async function createPdfFromPresentation(presentation, { title = "Presentation" } = {}) {
  if (!presentation?.slides?.length) throw new Error("No presentation slides were available for conversion.");
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ratio = presentation.width / Math.max(1, presentation.height);
  const pageWidth = ratio >= 1 ? 720 : Math.max(420, 720 * ratio);
  const pageHeight = pageWidth / ratio;

  for (const slide of presentation.slides) {
    const page = pdf.addPage([pageWidth, pageHeight]);
    page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: rgbFromHex(slide.background) });
    for (const element of slide.elements) {
      const x = element.x / presentation.width * pageWidth;
      const width = Math.max(1, element.width / presentation.width * pageWidth);
      const height = Math.max(1, element.height / presentation.height * pageHeight);
      const y = pageHeight - (element.y / presentation.height * pageHeight) - height;
      if (element.type === "image" && element.bytes) {
        try {
          const isJpeg = element.bytes[0] === 0xff && element.bytes[1] === 0xd8;
          const image = isJpeg ? await pdf.embedJpg(element.bytes) : await pdf.embedPng(element.bytes);
          page.drawImage(image, { x, y, width, height });
        } catch {
          page.drawRectangle({ x, y, width, height, color: rgb(0.94, 0.95, 0.98), borderColor: rgb(0.75, 0.79, 0.86), borderWidth: 0.6 });
        }
        continue;
      }
      if (element.type !== "shape") continue;
      const hasVisibleFill = element.fill !== "FFFFFF" || !element.text;
      if (hasVisibleFill) {
        if (element.geometry === "ellipse") page.drawEllipse({ x: x + width / 2, y: y + height / 2, xScale: width / 2, yScale: height / 2, color: rgbFromHex(element.fill) });
        else page.drawRectangle({ x, y, width, height, color: rgbFromHex(element.fill), borderColor: rgb(0.78, 0.81, 0.87), borderWidth: 0.35 });
      }
      if (!element.text) continue;
      const font = element.bold ? bold : regular;
      const size = Math.max(6, Math.min(44, element.size * (pageWidth / 960)));
      const lines = element.text.split("\n");
      let textY = y + height - size - 4;
      for (const line of lines) {
        if (textY < y + 2) break;
        page.drawText(fitText(line, Math.max(1, width - 8), font, size), { x: x + 4, y: textY, size, font, color: rgbFromHex(element.color, rgb(0.09, 0.13, 0.2)) });
        textY -= size * 1.22;
      }
    }
  }
  pdf.setTitle(pdfText(title));
  pdf.setCreator("FixThatPDF");
  pdf.setProducer("FixThatPDF browser presentation conversion");
  return pdf.save();
}

export function sanitizeHtmlForRendering(source) {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(String(source || ""), "text/html");
  documentNode.querySelectorAll("script,iframe,frame,object,embed,applet,base,form,meta[http-equiv]").forEach((node) => node.remove());
  documentNode.querySelectorAll("*").forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith("on") || ((name === "src" || name === "href" || name === "action") && /^(?:javascript:|https?:|\/\/)/i.test(value))) element.removeAttribute(attribute.name);
      if (name === "style") element.setAttribute("style", value.replace(/@import[^;]+;?/gi, "").replace(/url\(\s*(['"]?)(?:https?:|\/\/)[^)]+\)/gi, "none"));
    });
  });
  documentNode.querySelectorAll("style").forEach((style) => { style.textContent = String(style.textContent || "").replace(/@import[^;]+;?/gi, "").replace(/url\(\s*(['"]?)(?:https?:|\/\/)[^)]+\)/gi, "none"); });
  const body = documentNode.body?.innerHTML || "";
  const headStyles = [...documentNode.head?.querySelectorAll("style") || []].map((style) => style.outerHTML).join("");
  return `<!doctype html><html><head><meta charset="utf-8">${headStyles}<style>html{background:#fff}body{margin:0;overflow-wrap:anywhere}</style></head><body>${body}</body></html>`;
}

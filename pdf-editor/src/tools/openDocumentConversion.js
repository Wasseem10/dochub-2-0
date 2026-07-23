import { strFromU8, unzipSync } from "fflate";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createPdfFromImages } from "./imageConversion.js";
import { createPdfFromPlainText } from "./textConversion.js";
import { createPdfFromWorkbook } from "./toPdfConversion.js";

export const OPEN_DOCUMENT_LIMITS = Object.freeze({
  maxInputBytes: 25 * 1024 * 1024,
  maxExpandedBytes: 120 * 1024 * 1024,
  maxArchiveEntries: 250,
  maxOutputPages: 200,
});

const MODE_CONFIG = Object.freeze({
  "rtf-to-pdf": { extensions: [".rtf"], label: "RTF" },
  "odt-to-pdf": { extensions: [".odt"], label: "ODT" },
  "odp-to-pdf": { extensions: [".odp"], label: "ODP" },
  "ods-to-pdf": { extensions: [".ods"], label: "ODS" },
  "epub-to-pdf": { extensions: [".epub"], label: "EPUB" },
  "zip-to-pdf": { extensions: [".zip"], label: "ZIP" },
});

function bytesOf(input) {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

export function validateOpenDocumentFile(file, toolId) {
  const mode = MODE_CONFIG[toolId];
  if (!mode) return "This conversion type is unavailable.";
  if (!file) return "Choose a file to continue.";
  if (!file.size) return "This file is empty.";
  if (file.size > OPEN_DOCUMENT_LIMITS.maxInputBytes) return "Choose a file no larger than 25 MB.";
  const name = String(file.name || "").toLowerCase();
  if (!mode.extensions.some((extension) => name.endsWith(extension))) return `Choose a ${mode.label} file.`;
  return "";
}

function decodeEntities(value = "") {
  return String(value)
    .replace(/&#x([\da-f]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replaceAll("&nbsp;", " ")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

function safeArchive(input) {
  let count = 0;
  let expanded = 0;
  try {
    return unzipSync(bytesOf(input), { filter(entry) {
      count += 1;
      expanded += Number(entry.originalSize || 0);
      if (count > OPEN_DOCUMENT_LIMITS.maxArchiveEntries) throw new Error("This archive contains too many files.");
      if (expanded > OPEN_DOCUMENT_LIMITS.maxExpandedBytes || entry.originalSize > 40 * 1024 * 1024) throw new Error("This archive expands beyond the safe browser limit.");
      if (entry.name.startsWith("/") || entry.name.split("/").includes("..")) throw new Error("This archive contains an unsafe file path.");
      return !entry.name.endsWith("/");
    } });
  } catch (error) {
    if (/too many|safe browser|unsafe file path/.test(String(error?.message || ""))) throw error;
    throw new Error("This file is not a valid browser-readable archive.");
  }
}

function cleanText(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function xmlToPlainText(xml) {
  const marked = String(xml || "")
    .replace(/<(?:text:tab|text:line-break)\b[^>]*\/?\s*>/gi, (tag) => /tab/i.test(tag) ? "\t" : "\n")
    .replace(/<text:s\b[^>]*text:c=["'](\d+)["'][^>]*\/?\s*>/gi, (_, count) => " ".repeat(Math.min(100, Number(count))))
    .replace(/<text:s\b[^>]*\/?\s*>/gi, " ")
    .replace(/<\/text:(?:p|h)>/gi, "\n")
    .replace(/<\/table:table-cell>/gi, "\t")
    .replace(/<\/table:table-row>/gi, "\n")
    .replace(/<br\b[^>]*\/?\s*>/gi, "\n")
    .replace(/<\/(?:p|h[1-6]|li|div|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return cleanText(decodeEntities(marked));
}

const RTF_DESTINATIONS = new Set(["fonttbl", "colortbl", "stylesheet", "info", "pict", "object", "header", "footer", "filetbl", "listtable", "listoverridetable", "generator", "xmlnstbl", "datastore", "themedata"]);

export function parseRtfText(input) {
  const source = typeof input === "string" ? input : new TextDecoder("latin1").decode(bytesOf(input));
  if (!/^\s*\{\\rtf\d?/i.test(source)) throw new Error("This file is not a valid RTF document.");
  const stack = [{ skip: false, uc: 1 }];
  let result = "";
  let pendingFallback = 0;
  for (let index = 0; index < source.length;) {
    const state = stack.at(-1);
    const char = source[index];
    if (char === "{") { stack.push({ ...state }); index += 1; continue; }
    if (char === "}") { if (stack.length > 1) stack.pop(); index += 1; continue; }
    if (char !== "\\") {
      if (!state.skip && pendingFallback <= 0 && char !== "\r" && char !== "\n") result += char;
      else if (pendingFallback > 0) pendingFallback -= 1;
      index += 1;
      continue;
    }
    const next = source[index + 1];
    if (["\\", "{", "}"].includes(next)) { if (!state.skip && pendingFallback <= 0) result += next; else if (pendingFallback > 0) pendingFallback -= 1; index += 2; continue; }
    if (next === "'") {
      const value = Number.parseInt(source.slice(index + 2, index + 4), 16);
      if (!state.skip && pendingFallback <= 0 && Number.isFinite(value)) result += new TextDecoder("windows-1252").decode(Uint8Array.of(value));
      else if (pendingFallback > 0) pendingFallback -= 1;
      index += 4; continue;
    }
    if (next === "*") { state.skip = true; index += 2; continue; }
    const match = source.slice(index + 1).match(/^([a-z]+)(-?\d+)? ?/i);
    if (!match) { index += 2; continue; }
    const word = match[1].toLowerCase();
    const parameter = match[2] == null ? null : Number(match[2]);
    index += 1 + match[0].length;
    if (RTF_DESTINATIONS.has(word)) { state.skip = true; continue; }
    if (word === "uc" && Number.isFinite(parameter)) { state.uc = Math.max(0, parameter); continue; }
    if (state.skip) continue;
    if (word === "par" || word === "line") result += "\n";
    else if (word === "tab") result += "\t";
    else if (word === "emdash") result += "—";
    else if (word === "endash") result += "–";
    else if (word === "bullet") result += "•";
    else if (word === "u" && Number.isFinite(parameter)) {
      result += String.fromCharCode(parameter < 0 ? parameter + 65536 : parameter);
      pendingFallback = state.uc;
    }
  }
  const text = cleanText(result);
  if (!text) throw new Error("No readable text was found in this RTF file.");
  return text;
}

function odfXml(input) {
  const files = safeArchive(input);
  const content = files["content.xml"];
  if (!content) throw new Error("This OpenDocument file does not contain content.xml.");
  return { files, xml: strFromU8(content) };
}

export function parseOdtText(input) {
  const text = xmlToPlainText(odfXml(input).xml);
  if (!text) throw new Error("No readable text was found in this ODT file.");
  return text;
}

function attr(source, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return decodeEntities(String(source || "").match(new RegExp(`${escaped}=["']([^"']*)["']`, "i"))?.[1] || "");
}

export function parseOdsWorkbook(input) {
  const { xml } = odfXml(input);
  const sheets = [];
  for (const table of xml.matchAll(/<table:table\b([^>]*)>([\s\S]*?)<\/table:table>/gi)) {
    const rows = [];
    for (const row of table[2].matchAll(/<table:table-row\b([^>]*)>([\s\S]*?)<\/table:table-row>/gi)) {
      const rowRepeat = Math.min(100, Math.max(1, Number(attr(row[1], "table:number-rows-repeated") || 1)));
      const values = [];
      for (const cell of row[2].matchAll(/<table:(?:table-cell|covered-table-cell)\b([^>]*)>([\s\S]*?)<\/table:(?:table-cell|covered-table-cell)>|<table:(?:table-cell|covered-table-cell)\b([^>]*)\/>/gi)) {
        const attrs = cell[1] || cell[3] || "";
        const body = cell[2] || "";
        const repeat = Math.min(120, Math.max(1, Number(attr(attrs, "table:number-columns-repeated") || 1)));
        const value = xmlToPlainText(body) || attr(attrs, "office:string-value") || attr(attrs, "office:value") || attr(attrs, "office:date-value");
        for (let count = 0; count < repeat; count += 1) values.push(value);
      }
      while (values.length && !values.at(-1)) values.pop();
      for (let count = 0; count < rowRepeat; count += 1) rows.push([...values]);
      if (rows.length >= 2500) break;
    }
    sheets.push({ name: attr(table[1], "table:name") || `Sheet ${sheets.length + 1}`, rows });
    if (sheets.length >= 30) break;
  }
  if (!sheets.length) throw new Error("No worksheets were found in this ODS file.");
  return { sheets };
}

export function parseOdpSlides(input) {
  const { xml } = odfXml(input);
  const slides = [...xml.matchAll(/<draw:page\b([^>]*)>([\s\S]*?)<\/draw:page>/gi)].slice(0, 100).map((match, index) => ({
    title: attr(match[1], "draw:name") || `Slide ${index + 1}`,
    text: xmlToPlainText(match[2]),
  }));
  if (!slides.length) throw new Error("No slides were found in this ODP file.");
  return slides;
}

export async function createPdfFromTextSlides(slides, { title = "Presentation" } = {}) {
  if (!slides?.length) throw new Error("No slides were available for conversion.");
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  for (const [index, slide] of slides.entries()) {
    const page = pdf.addPage([720, 405]);
    page.drawRectangle({ x: 0, y: 0, width: 720, height: 405, color: rgb(0.98, 0.99, 1) });
    page.drawText(String(slide.title || `Slide ${index + 1}`).slice(0, 90), { x: 42, y: 350, size: 24, font: bold, color: rgb(0.06, 0.1, 0.2) });
    const lines = String(slide.text || "").split(/\n+/).flatMap((line) => {
      const words = line.split(/\s+/); const chunks = []; let current = "";
      for (const word of words) { const candidate = current ? `${current} ${word}` : word; if (regular.widthOfTextAtSize(candidate, 14) <= 620) current = candidate; else { if (current) chunks.push(current); current = word; } }
      if (current) chunks.push(current); return chunks;
    }).slice(0, 17);
    lines.forEach((line, lineIndex) => page.drawText(line.replace(/[^\x20-\xFF]/g, "?"), { x: 50, y: 310 - lineIndex * 17, size: 14, font: regular, color: rgb(0.12, 0.16, 0.24) }));
    page.drawText(`${index + 1} / ${slides.length}`, { x: 650, y: 20, size: 9, font: regular, color: rgb(0.45, 0.5, 0.6) });
  }
  pdf.setTitle(title);
  pdf.setCreator("PDFArrow");
  return pdf.save();
}

function normalizePath(base, target) {
  const parts = `${base}/${target}`.split("/");
  const output = [];
  for (const part of parts) { if (!part || part === ".") continue; if (part === "..") output.pop(); else output.push(part); }
  return output.join("/");
}

export function parseEpubText(input) {
  const files = safeArchive(input);
  const container = strFromU8(files["META-INF/container.xml"] || new Uint8Array());
  const packagePath = attr(container, "full-path");
  if (!packagePath || !files[packagePath]) throw new Error("This EPUB does not contain a readable package document.");
  const packageXml = strFromU8(files[packagePath]);
  const manifest = new Map([...packageXml.matchAll(/<item\b([^>]*)\/?\s*>/gi)].map((match) => [attr(match[1], "id"), attr(match[1], "href")]));
  const base = packagePath.split("/").slice(0, -1).join("/");
  const chapters = [];
  for (const item of packageXml.matchAll(/<itemref\b([^>]*)\/?\s*>/gi)) {
    const href = manifest.get(attr(item[1], "idref"));
    const bytes = href ? files[normalizePath(base, href.split("#")[0])] : null;
    if (!bytes) continue;
    const text = xmlToPlainText(strFromU8(bytes));
    if (text) chapters.push(text);
  }
  const text = cleanText(chapters.join("\n\n"));
  if (!text) throw new Error("No readable chapters were found in this EPUB.");
  return text;
}

function supportedArchiveEntries(input) {
  const files = safeArchive(input);
  const entries = Object.entries(files).filter(([name, data]) => {
    const lower = name.toLowerCase();
    return data.length && !name.startsWith("__MACOSX/") && !/\/(?:\.|__)/.test(name) && /\.(?:pdf|png|jpe?g|txt|md|html?|rtf|odt|odp|ods|epub)$/.test(lower);
  }).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  if (!entries.length) throw new Error("This ZIP does not contain supported PDF, image, text, HTML, RTF, OpenDocument, or EPUB files.");
  return entries;
}

async function appendPdf(output, input) {
  const source = await PDFDocument.load(input);
  const pages = await output.copyPages(source, source.getPageIndices());
  pages.forEach((page) => output.addPage(page));
}

async function convertNestedEntry(name, data) {
  const lower = name.toLowerCase();
  const title = name.split("/").at(-1).replace(/\.[^.]+$/, "");
  if (lower.endsWith(".pdf")) return data;
  if (/\.(?:png|jpe?g)$/.test(lower)) return createPdfFromImages([{ bytes: data, mimeType: lower.endsWith(".png") ? "image/png" : "image/jpeg" }], { title });
  if (lower.endsWith(".rtf")) return createPdfFromPlainText(parseRtfText(data), { title });
  if (lower.endsWith(".odt")) return createPdfFromPlainText(parseOdtText(data), { title });
  if (lower.endsWith(".ods")) return createPdfFromWorkbook(parseOdsWorkbook(data), { title });
  if (lower.endsWith(".odp")) return createPdfFromTextSlides(parseOdpSlides(data), { title });
  if (lower.endsWith(".epub")) return createPdfFromPlainText(parseEpubText(data), { title });
  const text = /\.html?$/.test(lower) ? xmlToPlainText(strFromU8(data)) : strFromU8(data);
  return createPdfFromPlainText(text, { title });
}

export async function createPdfFromZip(input, { title = "ZIP document", onProgress } = {}) {
  const entries = supportedArchiveEntries(input);
  const output = await PDFDocument.create();
  for (const [index, [name, data]] of entries.entries()) {
    try {
      await appendPdf(output, await convertNestedEntry(name, data));
    } catch (error) {
      throw new Error(`${name} could not be converted: ${error?.message || "unsupported content"}`);
    }
    if (output.getPageCount() > OPEN_DOCUMENT_LIMITS.maxOutputPages) throw new Error(`ZIP conversion supports up to ${OPEN_DOCUMENT_LIMITS.maxOutputPages} output pages.`);
    onProgress?.({ completed: index + 1, total: entries.length });
  }
  output.setTitle(title);
  output.setCreator("PDFArrow");
  return output.save();
}

export async function convertOpenDocumentToPdf(toolId, input, { title = "Document", onProgress } = {}) {
  const bytes = bytesOf(input);
  if (toolId === "rtf-to-pdf") return createPdfFromPlainText(parseRtfText(bytes), { title });
  if (toolId === "odt-to-pdf") return createPdfFromPlainText(parseOdtText(bytes), { title });
  if (toolId === "ods-to-pdf") return createPdfFromWorkbook(parseOdsWorkbook(bytes), { title });
  if (toolId === "odp-to-pdf") return createPdfFromTextSlides(parseOdpSlides(bytes), { title });
  if (toolId === "epub-to-pdf") return createPdfFromPlainText(parseEpubText(bytes), { title });
  if (toolId === "zip-to-pdf") return createPdfFromZip(bytes, { title, onProgress });
  throw new Error("This conversion type is unavailable.");
}

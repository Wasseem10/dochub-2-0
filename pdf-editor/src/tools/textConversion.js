import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const TEXT_CONVERSION_LIMITS = Object.freeze({
  maxBytes: 10 * 1024 * 1024,
  maxPdfPages: 200,
  maxTextCharacters: 750_000,
});

export function validateTextConversionFile(file, mode) {
  if (!file) return "Choose a file to continue.";
  if (!file.size) return "This file is empty.";
  if (file.size > TEXT_CONVERSION_LIMITS.maxBytes) return "Choose a file no larger than 10 MB.";
  if (mode === "pdf" && file.type !== "application/pdf" && !/\.pdf$/i.test(file.name || "")) return "Choose a PDF file.";
  if (mode === "txt" && !["text/plain", ""].includes(file.type) && !/\.txt$/i.test(file.name || "")) return "Choose a plain TXT file.";
  return "";
}

export function textContentToPlainText(textContent) {
  const lines = [];
  let current = "";
  for (const item of textContent?.items || []) {
    const value = String(item.str || "");
    if (!value) continue;
    const separator = current && !/\s$/.test(current) && !/^\s/.test(value) ? " " : "";
    current += `${separator}${value}`;
    if (item.hasEOL) {
      lines.push(current.trimEnd());
      current = "";
    }
  }
  if (current.trim()) lines.push(current.trimEnd());
  return lines.join("\n").replace(/[ \t]+\n/g, "\n").trim();
}

export async function extractPlainTextFromPdf(pdfDocument) {
  if (!pdfDocument?.numPages) throw new Error("This PDF has no readable pages.");
  if (pdfDocument.numPages > TEXT_CONVERSION_LIMITS.maxPdfPages) throw new Error(`PDF to TXT supports up to ${TEXT_CONVERSION_LIMITS.maxPdfPages} pages.`);
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    pages.push(textContentToPlainText(await page.getTextContent()));
  }
  const text = pages.map((pageText, index) => `${pdfDocument.numPages > 1 ? `Page ${index + 1}\n${"=".repeat(`Page ${index + 1}`.length)}\n` : ""}${pageText}`).join("\n\n").trim();
  if (!text) throw new Error("No embedded text was found. Scanned image PDFs need OCR before TXT conversion.");
  return text;
}

function toPdfSafeText(text) {
  const normalized = String(text || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...");
  return Array.from(normalized, (character) => {
    const code = character.charCodeAt(0);
    return code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126) || (code >= 160 && code <= 255) ? character : "?";
  }).join("");
}

export function wrapPlainText(text, font, fontSize, maxWidth) {
  const paragraphs = toPdfSafeText(text).replace(/\r\n?/g, "\n").split("\n");
  const lines = [];
  for (const paragraph of paragraphs) {
    if (!paragraph) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
        line = word;
        continue;
      }
      let chunk = "";
      for (const character of word) {
        const next = `${chunk}${character}`;
        if (chunk && font.widthOfTextAtSize(next, fontSize) > maxWidth) {
          lines.push(chunk);
          chunk = character;
        } else {
          chunk = next;
        }
      }
      line = chunk;
    }
    if (line) lines.push(line);
  }
  return lines;
}

export async function createPdfFromPlainText(text, { title = "Text document", fontSize = 11, pageSize = "letter" } = {}) {
  const cleanText = String(text || "");
  if (!cleanText.trim()) throw new Error("This text file is empty.");
  if (cleanText.length > TEXT_CONVERSION_LIMITS.maxTextCharacters) throw new Error("This TXT file contains too much text for safe browser conversion.");
  const pdf = await PDFDocument.create();
  pdf.setTitle(String(title || "Text document").slice(0, 120));
  pdf.setCreator("FixThatPDF");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const dimensions = pageSize === "a4" ? [595.28, 841.89] : [612, 792];
  const margin = 54;
  const lineHeight = fontSize * 1.45;
  const lines = wrapPlainText(cleanText, font, fontSize, dimensions[0] - margin * 2);
  const linesPerPage = Math.max(1, Math.floor((dimensions[1] - margin * 2) / lineHeight));
  for (let offset = 0; offset < lines.length; offset += linesPerPage) {
    const page = pdf.addPage(dimensions);
    lines.slice(offset, offset + linesPerPage).forEach((line, index) => {
      if (!line) return;
      page.drawText(line, { x: margin, y: dimensions[1] - margin - fontSize - index * lineHeight, size: fontSize, font, color: rgb(0.08, 0.1, 0.15) });
    });
  }
  return pdf.save();
}

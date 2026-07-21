import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const OCR_PDF_LIMITS = Object.freeze({
  maxInputBytes: 12 * 1024 * 1024,
  maxPages: 12,
  renderScale: 1.7,
});

export function validateOcrPdf(file) {
  if (!file) return "Choose a PDF to continue.";
  if (!file.size) return "This PDF is empty.";
  if (file.size > OCR_PDF_LIMITS.maxInputBytes) return "Choose a PDF no larger than 12 MB.";
  if (!String(file.name || "").toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") return "Choose a PDF file.";
  return "";
}

function safeText(value) {
  return String(value || "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?")
    .trim();
}

export function flattenOcrWords(data) {
  const words = [];
  for (const block of data?.blocks || []) {
    for (const paragraph of block.paragraphs || []) {
      for (const line of paragraph.lines || []) {
        for (const word of line.words || []) {
          const text = safeText(word.text);
          const bbox = word.bbox;
          if (text && bbox && Number.isFinite(bbox.x0) && Number.isFinite(bbox.y0) && Number.isFinite(bbox.x1) && Number.isFinite(bbox.y1)) {
            words.push({ text, confidence: Number(word.confidence || 0), bbox });
          }
        }
      }
    }
  }
  return words;
}

export function ocrTextFromPages(pages) {
  return pages.map((page, index) => `Page ${index + 1}\n${page.text || page.words.map((word) => word.text).join(" ")}`).join("\n\n");
}

export async function createSearchablePdfFromOcrPages(pages, { title = "Searchable document" } = {}) {
  if (!pages?.length) throw new Error("No OCR pages were available for export.");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const source of pages) {
    const pageWidth = 612;
    const pageHeight = pageWidth * source.imageHeight / Math.max(1, source.imageWidth);
    const page = pdf.addPage([pageWidth, pageHeight]);
    const image = await pdf.embedPng(source.imageBytes);
    page.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight });
    for (const word of source.words || []) {
      const text = safeText(word.text);
      if (!text) continue;
      const x = word.bbox.x0 / source.imageWidth * pageWidth;
      const y = pageHeight - word.bbox.y1 / source.imageHeight * pageHeight;
      const height = Math.max(4, (word.bbox.y1 - word.bbox.y0) / source.imageHeight * pageHeight);
      const size = Math.max(4, Math.min(48, height * 0.82));
      page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0), opacity: 0 });
    }
  }
  pdf.setTitle(safeText(title));
  pdf.setCreator("FixThatPDF");
  pdf.setProducer("FixThatPDF browser OCR");
  return pdf.save();
}

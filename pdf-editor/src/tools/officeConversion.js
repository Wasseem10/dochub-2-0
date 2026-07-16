import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  PageBreak,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { PDFDocument } from "pdf-lib";

export const OFFICE_CONVERSION_LIMITS = Object.freeze({
  maxInputBytes: 20 * 1024 * 1024,
  maxPages: 50,
  maxRenderedPixels: 18_000_000,
});

export function validateOfficeConversionFile(file, kind) {
  if (!file) return "Choose a file to continue.";
  if (file.size > OFFICE_CONVERSION_LIMITS.maxInputBytes) return "Choose a file smaller than 20 MB.";
  if (!file.size) return "This file is empty.";
  const name = String(file.name || "").toLowerCase();
  if (kind === "pdf" && file.type !== "application/pdf" && !name.endsWith(".pdf")) return "Choose a PDF file.";
  if (kind === "docx" && file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && !name.endsWith(".docx")) {
    return "Choose a DOCX file. Legacy .doc files must first be saved as DOCX in Word or LibreOffice.";
  }
  return "";
}

function joinPdfLineItems(items) {
  return items.reduce((text, item, index) => {
    const value = String(item.str || "").trim();
    if (!value) return text;
    if (!index || !text) return value;
    const previous = items[index - 1];
    const previousEnd = Number(previous.transform?.[4] || 0) + Number(previous.width || 0);
    const nextStart = Number(item.transform?.[4] || 0);
    const averageHeight = Math.max(5, Number(item.height || previous.height || 10));
    const needsSpace = nextStart - previousEnd > averageHeight * 0.12
      && !/[-/(‘“]$/.test(text)
      && !/^[,.;:!?%)/’”]/.test(value);
    return `${text}${needsSpace ? " " : ""}${value}`;
  }, "").replace(/\s+/g, " ").trim();
}

export function groupPdfTextItems(items = []) {
  const positioned = items
    .filter((item) => String(item?.str || "").trim())
    .map((item) => ({
      ...item,
      x: Number(item.transform?.[4] || 0),
      y: Number(item.transform?.[5] || 0),
      fontSize: Math.max(6, Math.abs(Number(item.transform?.[3] || item.height || 11))),
    }))
    .sort((a, b) => Math.abs(b.y - a.y) > Math.max(a.fontSize, b.fontSize) * 0.45 ? b.y - a.y : a.x - b.x);

  const lines = [];
  positioned.forEach((item) => {
    const tolerance = Math.max(2.5, item.fontSize * 0.42);
    let line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
    if (!line) {
      line = { y: item.y, items: [], fontSize: item.fontSize };
      lines.push(line);
    }
    line.items.push(item);
    line.fontSize = Math.max(line.fontSize, item.fontSize);
  });

  return lines
    .sort((a, b) => b.y - a.y)
    .map((line) => ({
      text: joinPdfLineItems(line.items.sort((a, b) => a.x - b.x)),
      fontSize: line.fontSize,
    }))
    .filter((line) => line.text);
}

function docxPageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function editablePageParagraphs(page, pageIndex, baseFontSize) {
  const children = [];
  if (pageIndex > 0) children.push(docxPageBreak());
  if (!page.lines?.length) {
    children.push(new Paragraph({ children: [new TextRun({ text: "This page does not contain extractable text.", italics: true, color: "64748B" })] }));
    return children;
  }
  page.lines.forEach((line) => {
    const heading = line.fontSize >= baseFontSize * 1.45 && line.text.length <= 140;
    children.push(new Paragraph({
      heading: heading ? HeadingLevel.HEADING_1 : undefined,
      spacing: heading ? { before: 180, after: 100 } : { after: 80, line: 276 },
      children: [new TextRun({ text: line.text, size: heading ? 30 : 22, bold: heading })],
    }));
  });
  return children;
}

function visualPageParagraphs(page, pageIndex) {
  const children = [];
  if (pageIndex > 0) children.push(docxPageBreak());
  const width = 624;
  const height = Math.min(820, Math.round(width * (page.height / Math.max(1, page.width))));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 0 },
    children: [new ImageRun({ data: page.imageBytes, transformation: { width, height }, type: "png" })],
  }));
  return children;
}

export async function createDocxFromPdfPages(pages, options = {}) {
  if (!Array.isArray(pages) || !pages.length) throw new Error("No PDF pages were provided.");
  if (pages.length > OFFICE_CONVERSION_LIMITS.maxPages) throw new Error(`PDF to Word supports up to ${OFFICE_CONVERSION_LIMITS.maxPages} pages.`);
  const mode = options.mode || "editable";
  const allFontSizes = pages.flatMap((page) => (page.lines || []).map((line) => line.fontSize)).sort((a, b) => a - b);
  const baseFontSize = allFontSizes[Math.floor(allFontSizes.length / 2)] || 11;
  const children = pages.flatMap((page, index) => (
    mode === "visual" ? visualPageParagraphs(page, index) : editablePageParagraphs(page, index, baseFontSize)
  ));
  const document = new Document({
    creator: "RealPDF",
    title: options.title || "Converted PDF",
    description: mode === "visual" ? "PDF pages converted to visual Word pages" : "PDF text converted to editable Word paragraphs",
    styles: {
      default: {
        document: { run: { font: "Arial", size: 22, color: "172033" }, paragraph: { spacing: { after: 80, line: 276 } } },
        heading1: { run: { font: "Arial", size: 30, bold: true, color: "172033" }, paragraph: { spacing: { before: 180, after: 100 } } },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: mode === "visual"
            ? { top: 360, right: 360, bottom: 360, left: 360 }
            : { top: 1080, right: 1080, bottom: 1080, left: 1080 },
        },
      },
      children,
    }],
  });
  const blob = await Packer.toBlob(document);
  return new Uint8Array(await blob.arrayBuffer());
}

export async function createPdfFromRenderedDocxPages(pages, options = {}) {
  if (!Array.isArray(pages) || !pages.length) throw new Error("No rendered Word pages were provided.");
  if (pages.length > OFFICE_CONVERSION_LIMITS.maxPages) throw new Error(`Word to PDF supports up to ${OFFICE_CONVERSION_LIMITS.maxPages} pages.`);
  const pdf = await PDFDocument.create();
  for (const renderedPage of pages) {
    const bytes = renderedPage.bytes instanceof Uint8Array ? renderedPage.bytes : new Uint8Array(renderedPage.bytes);
    const image = await pdf.embedPng(bytes);
    const aspect = image.height / Math.max(1, image.width);
    const isLetterLike = Math.abs(aspect - (11 / 8.5)) < 0.12;
    const width = 612;
    const height = isLetterLike ? 792 : Math.min(1008, Math.max(432, width * aspect));
    const page = pdf.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
  }
  pdf.setTitle(options.title || "Converted Word document");
  pdf.setCreator("RealPDF");
  return pdf.save();
}

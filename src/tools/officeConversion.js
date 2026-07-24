import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  PageBreak,
  Packer,
  Paragraph,
  Tab,
  TabStopType,
  TextRun,
} from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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

export function groupPdfTextItems(items = [], styles = {}) {
  const positioned = items
    .filter((item) => String(item?.str || "").trim())
    .map((item) => ({
      ...item,
      x: Number(item.transform?.[4] || 0),
      y: Number(item.transform?.[5] || 0),
      fontSize: Math.max(6, Math.abs(Number(item.transform?.[3] || item.height || 11))),
      fontFamily: styles[item.fontName]?.fontFamily || "",
      bold: /bold|black|heavy|semibold|demi/i.test(`${item.fontName || ""} ${styles[item.fontName]?.fontFamily || ""}`),
      italic: /italic|oblique/i.test(`${item.fontName || ""} ${styles[item.fontName]?.fontFamily || ""}`),
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
    .map((line) => {
      const orderedItems = line.items.sort((a, b) => a.x - b.x);
      const text = joinPdfLineItems(orderedItems);
      const segments = [];
      orderedItems.forEach((item, index) => {
        const value = String(item.str || "").trim();
        if (!value) return;
        const previous = orderedItems[index - 1];
        const previousEnd = Number(previous?.x || 0) + Number(previous?.width || 0);
        const needsSpace = index > 0
          && Number(item.x || 0) - previousEnd > Math.max(5, item.fontSize) * 0.12
          && !/[-/(‘“]$/.test(segments.at(-1)?.text || "")
          && !/^[,.;:!?%)/’”]/.test(value);
        segments.push({
          text: `${needsSpace ? " " : ""}${value}`,
          x: item.x,
          width: Number(item.width || 0),
          gapBefore: index > 0 ? Math.max(0, Number(item.x || 0) - previousEnd) : 0,
          fontSize: item.fontSize,
          fontFamily: item.fontFamily,
          bold: item.bold,
          italic: item.italic,
        });
      });
      const left = Math.min(...orderedItems.map((item) => item.x));
      const right = Math.max(...orderedItems.map((item) => item.x + Number(item.width || 0)));
      return {
        text,
        segments,
        x: left,
        y: line.y,
        width: Math.max(0, right - left),
        fontSize: line.fontSize,
      };
    })
    .filter((line) => line.text);
}

export function groupOcrWordsIntoLines(words = [], imageWidth, imageHeight, pageWidth = 612, pageHeight = 792) {
  const safeImageWidth = Math.max(1, Number(imageWidth) || 1);
  const safeImageHeight = Math.max(1, Number(imageHeight) || 1);
  return groupPdfTextItems(words.map((word) => {
    const bbox = word?.bbox || {};
    const x = Number(bbox.x0 || 0) / safeImageWidth * pageWidth;
    const top = Number(bbox.y0 || 0) / safeImageHeight * pageHeight;
    const width = Math.max(1, (Number(bbox.x1 || 0) - Number(bbox.x0 || 0)) / safeImageWidth * pageWidth);
    const height = Math.max(6, (Number(bbox.y1 || 0) - Number(bbox.y0 || 0)) / safeImageHeight * pageHeight);
    return {
      str: String(word?.text || ""),
      transform: [1, 0, 0, height, x, pageHeight - top - height],
      width,
      height,
    };
  }));
}

function docxPageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function safeWordFont(value = "") {
  if (/times|serif/i.test(value)) return "Times New Roman";
  if (/courier|mono/i.test(value)) return "Courier New";
  return "Arial";
}

function editablePageParagraphs(page, pageIndex, baseFontSize) {
  const children = [];
  if (pageIndex > 0) children.push(docxPageBreak());
  if (!page.lines?.length) {
    children.push(new Paragraph({ children: [new TextRun({ text: "This page does not contain extractable text.", italics: true, color: "64748B" })] }));
    return children;
  }
  let previousTop = 0;
  page.lines.forEach((line, lineIndex) => {
    const heading = line.fontSize >= baseFontSize * 1.45 && line.text.length <= 140;
    const pageWidth = Math.max(1, Number(page.pageWidth || 612));
    const pageHeight = Math.max(1, Number(page.pageHeight || 792));
    const top = Math.max(0, pageHeight - Number(line.y || pageHeight));
    const verticalGap = lineIndex ? Math.max(0, top - previousTop - line.fontSize * 1.15) : Math.max(0, top - 28);
    previousTop = top;
    const leftIndent = Math.round(Math.max(0, Math.min(0.78, Number(line.x || 0) / pageWidth)) * 10080);
    const centered = Math.abs((Number(line.x || 0) + Number(line.width || 0) / 2) - pageWidth / 2) < pageWidth * 0.045
      && Number(line.width || 0) < pageWidth * 0.82;
    const sourceSegments = line.segments?.length ? line.segments : [{ text: line.text, fontSize: line.fontSize }];
    const tabbedSegments = sourceSegments.map((segment, index) => ({
      ...segment,
      useTab: index > 0 && Number(segment.gapBefore || 0) > Math.max(12, Number(segment.fontSize || line.fontSize || 11) * 1.6),
    }));
    const runs = tabbedSegments.flatMap((segment) => [
      ...(segment.useTab ? [new TextRun({ children: [new Tab()] })] : []),
      new TextRun({
        text: segment.useTab ? String(segment.text || "").trimStart() : segment.text,
        size: Math.round(Math.max(8, Math.min(36, Number(segment.fontSize || line.fontSize || 11))) * 2),
        font: safeWordFont(segment.fontFamily),
        bold: heading || Boolean(segment.bold),
        italics: Boolean(segment.italic),
      }),
    ]);
    const tabStops = tabbedSegments
      .filter((segment) => segment.useTab)
      .map((segment) => ({ type: TabStopType.LEFT, position: Math.round(Math.max(0, Math.min(pageWidth, Number(segment.x || 0))) / pageWidth * 10080) }));
    children.push(new Paragraph({
      heading: heading ? HeadingLevel.HEADING_1 : undefined,
      alignment: centered ? AlignmentType.CENTER : undefined,
      indent: centered ? undefined : { left: leftIndent },
      tabStops: centered || !tabStops.length ? undefined : tabStops,
      spacing: { before: Math.min(720, Math.round(verticalGap * 20)), after: heading ? 80 : 20, line: 276 },
      children: runs,
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
    creator: "PDFArrow",
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
  const searchableFont = pages.some((page) => page.textItems?.length)
    ? await pdf.embedFont(StandardFonts.Helvetica)
    : null;
  for (const renderedPage of pages) {
    const bytes = renderedPage.bytes instanceof Uint8Array ? renderedPage.bytes : new Uint8Array(renderedPage.bytes);
    const image = await pdf.embedPng(bytes);
    const aspect = image.height / Math.max(1, image.width);
    const isLetterLike = Math.abs(aspect - (11 / 8.5)) < 0.12;
    const width = 612;
    const height = isLetterLike ? 792 : Math.min(1008, Math.max(432, width * aspect));
    const page = pdf.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
    if (searchableFont) {
      const lines = [];
      [...(renderedPage.textItems || [])]
        .filter((item) => String(item.text || "").trim())
        .sort((left, right) => Number(left.y || 0) - Number(right.y || 0) || Number(left.x || 0) - Number(right.x || 0))
        .forEach((item) => {
          const center = Number(item.y || 0) + Number(item.h || 0) / 2;
          const line = lines.find((candidate) => Math.abs(candidate.center - center) <= Math.max(candidate.height, Number(item.h || 0.018)) * 0.55);
          if (line) {
            line.items.push(item);
            line.height = Math.max(line.height, Number(item.h || 0.018));
            line.center = (line.center * (line.items.length - 1) + center) / line.items.length;
          } else {
            lines.push({ center, height: Number(item.h || 0.018), items: [item] });
          }
        });
      lines.forEach((line) => {
        const lineItems = line.items.sort((left, right) => Number(left.x || 0) - Number(right.x || 0));
        const firstItem = lineItems[0];
        const text = lineItems.map((item) => String(item.text || "").trim()).join(" ");
        if (!text) return;
        const x = Math.max(0, Math.min(width - 2, Number(firstItem.x || 0) * width));
        const y = Math.max(0, Math.min(height - 2, height - (Number(firstItem.y || 0) + line.height) * height));
        const size = Math.max(4, Math.min(72, line.height * height * 0.82));
        page.drawText(text, { x, y, size, font: searchableFont, color: rgb(0, 0, 0), opacity: 0 });
      });
    }
  }
  pdf.setTitle(options.title || "Converted Word document");
  pdf.setCreator("PDFArrow");
  pdf.setProducer("PDFArrow browser conversion");
  return pdf.save();
}

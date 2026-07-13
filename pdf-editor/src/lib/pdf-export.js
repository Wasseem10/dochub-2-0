import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const DEFAULT_PAGE_WIDTH = 760;
const DEFAULT_PAGE_HEIGHT = 984;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex = "#111827") {
  const clean = String(hex).replace("#", "");
  const normalized = clean.length === 3 ? clean.split("").map((value) => value + value).join("") : clean;
  const parsed = Number.parseInt(normalized, 16);
  if (!Number.isFinite(parsed)) return rgb(0.07, 0.09, 0.15);
  return rgb(((parsed >> 16) & 255) / 255, ((parsed >> 8) & 255) / 255, (parsed & 255) / 255);
}

async function dataUrlToArrayBuffer(dataUrl) {
  const response = await fetch(dataUrl);
  return response.arrayBuffer();
}

async function embedDataUrlImage(pdfDoc, dataUrl) {
  if (!dataUrl) return null;
  const bytes = await dataUrlToArrayBuffer(dataUrl);
  return dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")
    ? pdfDoc.embedJpg(bytes)
    : pdfDoc.embedPng(bytes);
}

export async function buildEditedPdfBytes({
  pages,
  annotations = [],
  detectedTextItems = [],
  sourcePdfBytes = null,
}) {
  if (!Array.isArray(pages) || !pages.length) {
    throw new Error("A PDF export needs at least one page.");
  }

  const pdfDoc = await PDFDocument.create();
  const sourcePdf = sourcePdfBytes ? await PDFDocument.load(sourcePdfBytes) : null;

  for (const pageRecord of pages) {
    if (sourcePdf && pageRecord.source === "pdf" && Number.isInteger(pageRecord.originalIndex)) {
      const [copiedPage] = await pdfDoc.copyPages(sourcePdf, [pageRecord.originalIndex]);
      pdfDoc.addPage(copiedPage);
    } else {
      const fallbackPage = pdfDoc.addPage([
        612,
        Math.round(612 * ((pageRecord.height || DEFAULT_PAGE_HEIGHT) / (pageRecord.width || DEFAULT_PAGE_WIDTH))),
      ]);
      if (pageRecord.image) {
        const pageImage = await embedDataUrlImage(pdfDoc, pageRecord.image);
        if (pageImage) {
          const { width, height } = fallbackPage.getSize();
          fallbackPage.drawImage(pageImage, { x: 0, y: 0, width, height });
        }
      }
    }
  }

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const pickPdfFont = (fontFamily = "", isBold = false) => {
    const lowerFont = String(fontFamily).toLowerCase();
    if (isBold) return helveticaBold;
    if (lowerFont.includes("courier")) return courier;
    if (lowerFont.includes("times") || lowerFont.includes("georgia")) return timesRoman;
    return helvetica;
  };

  for (const item of detectedTextItems.filter((candidate) => candidate.isEdited || candidate.isDeleted)) {
    const page = pdfDoc.getPages()[item.pageNumber];
    if (!page) continue;
    const { width, height } = page.getSize();
    const pageRecord = pages[item.pageNumber] || {};
    const pdfScale = width / (pageRecord.width || DEFAULT_PAGE_WIDTH);
    const x = item.x * width;
    const boxHeight = item.h * height;
    const y = height - item.y * height - boxHeight;
    const boxWidth = item.w * width;
    const fontSize = clamp((item.fontSize || 11) * pdfScale, 4, 54);
    const font = pickPdfFont(item.fontFamily);
    const color = hexToRgb(item.color);

    page.drawRectangle({
      x: Math.max(0, x - 1.5),
      y: Math.max(0, y - 1.5),
      width: Math.min(width - x + 1.5, boxWidth + 3),
      height: Math.min(height - y + 1.5, boxHeight + 3),
      color: rgb(1, 1, 1),
      opacity: 1,
      borderOpacity: 0,
    });

    if (!item.isDeleted && String(item.currentText || "").trim()) {
      String(item.currentText || "").split("\n").forEach((line, index) => {
        page.drawText(line, {
          x: x + 1.5,
          y: y + Math.max(1, boxHeight - fontSize * 0.95) - index * fontSize * 1.18,
          size: fontSize,
          font,
          color,
          opacity: 1,
        });
      });
    }
  }

  for (const annotation of annotations) {
    const page = pdfDoc.getPages()[annotation.page];
    if (!page) continue;
    const { width, height } = page.getSize();
    const color = hexToRgb(annotation.color);
    const opacity = annotation.opacity ?? 1;

    if (annotation.type === "highlight" || annotation.type === "whiteout") {
      page.drawRectangle({
        x: annotation.x * width,
        y: height - annotation.y * height - annotation.h * height,
        width: annotation.w * width,
        height: annotation.h * height,
        color: annotation.type === "whiteout" ? rgb(1, 1, 1) : color,
        opacity,
        borderOpacity: 0,
      });
    }

    if (annotation.type === "checkbox") {
      const boxSize = Math.min(annotation.w * width, annotation.h * height);
      const x = annotation.x * width;
      const y = height - annotation.y * height - boxSize;
      page.drawRectangle({ x, y, width: boxSize, height: boxSize, borderColor: color, borderWidth: 1.5, color: rgb(1, 1, 1), opacity });
      if (annotation.checked) {
        page.drawLine({ start: { x: x + boxSize * 0.22, y: y + boxSize * 0.48 }, end: { x: x + boxSize * 0.42, y: y + boxSize * 0.25 }, thickness: 2, color });
        page.drawLine({ start: { x: x + boxSize * 0.42, y: y + boxSize * 0.25 }, end: { x: x + boxSize * 0.78, y: y + boxSize * 0.76 }, thickness: 2, color });
      }
    }

    if (annotation.type === "rectangle") {
      page.drawRectangle({
        x: annotation.x * width,
        y: height - annotation.y * height - annotation.h * height,
        width: annotation.w * width,
        height: annotation.h * height,
        borderColor: color,
        borderWidth: annotation.strokeWidth || 2,
        opacity,
      });
    }

    if (annotation.type === "circle") {
      page.drawEllipse({
        x: annotation.x * width + (annotation.w * width) / 2,
        y: height - annotation.y * height - (annotation.h * height) / 2,
        xScale: (annotation.w * width) / 2,
        yScale: (annotation.h * height) / 2,
        borderColor: color,
        borderWidth: annotation.strokeWidth || 2,
        opacity,
      });
    }

    if (annotation.type === "line" || annotation.type === "arrow") {
      const start = { x: annotation.x * width, y: height - annotation.y * height };
      const end = { x: (annotation.x + annotation.w) * width, y: height - (annotation.y + annotation.h) * height };
      page.drawLine({ start, end, thickness: annotation.strokeWidth || 3, color, opacity });
      if (annotation.type === "arrow") {
        const head = Math.max(10, (annotation.strokeWidth || 3) * 4);
        page.drawLine({ start: end, end: { x: end.x - head, y: end.y }, thickness: annotation.strokeWidth || 3, color, opacity });
        page.drawLine({ start: end, end: { x: end.x, y: end.y + head }, thickness: annotation.strokeWidth || 3, color, opacity });
      }
    }

    if (annotation.type === "comment") {
      const markerSize = Math.max(20, Math.min(annotation.w * width, annotation.h * height));
      const x = annotation.x * width;
      const y = height - annotation.y * height - markerSize;
      page.drawRectangle({ x, y, width: markerSize, height: markerSize, color: rgb(1, 0.74, 0.25), borderColor: rgb(0.86, 0.48, 0.03), borderWidth: 1, opacity });
      page.drawText("C", { x: x + markerSize * 0.32, y: y + markerSize * 0.28, size: markerSize * 0.46, font: helveticaBold, color: rgb(0.5, 0.25, 0.03) });
    }

    if (annotation.type === "field") {
      const x = annotation.x * width;
      const y = height - annotation.y * height - annotation.h * height;
      page.drawRectangle({ x, y, width: annotation.w * width, height: annotation.h * height, borderColor: color, borderWidth: 1.2, opacity });
      page.drawText(annotation.content || "Text field", { x: x + 8, y: y + Math.max(8, annotation.h * height * 0.32), size: annotation.fontSize || 11, font: helvetica, color, opacity: Math.min(0.82, opacity) });
    }

    if (annotation.type === "text") {
      String(annotation.content || "").split("\n").forEach((line, index) => {
        const font = pickPdfFont(annotation.fontFamily, annotation.bold);
        const fontSize = annotation.fontSize || 16;
        const textWidth = font.widthOfTextAtSize(line, fontSize);
        const boxWidth = annotation.w * width;
        const alignOffset = annotation.textAlign === "center" ? Math.max(0, (boxWidth - textWidth) / 2) : annotation.textAlign === "right" ? Math.max(0, boxWidth - textWidth - 8) : 0;
        page.drawText(line, {
          x: annotation.x * width + 8 + alignOffset,
          y: height - annotation.y * height - 22 - index * (fontSize * (annotation.lineHeight || 1.25)),
          size: fontSize,
          font,
          color,
          opacity,
        });
      });
    }

    if (annotation.type === "signature" || annotation.type === "initials") {
      if (annotation.imageDataUrl) {
        const image = await embedDataUrlImage(pdfDoc, annotation.imageDataUrl);
        if (image) page.drawImage(image, { x: annotation.x * width, y: height - annotation.y * height - annotation.h * height, width: annotation.w * width, height: annotation.h * height, opacity });
      } else if (annotation.content) {
        page.drawText(annotation.content, { x: annotation.x * width + 6, y: height - annotation.y * height - annotation.h * height + 7, size: annotation.fontSize || 28, font: timesItalic, color, opacity });
      }
    }

    if (annotation.type === "image" && annotation.imageDataUrl) {
      const image = await embedDataUrlImage(pdfDoc, annotation.imageDataUrl);
      if (image) page.drawImage(image, { x: annotation.x * width, y: height - annotation.y * height - annotation.h * height, width: annotation.w * width, height: annotation.h * height, opacity });
    }

    if (annotation.type === "draw") {
      (annotation.points || []).slice(1).forEach((point, index) => {
        const previous = annotation.points[index];
        page.drawLine({ start: { x: previous.x * width, y: height - previous.y * height }, end: { x: point.x * width, y: height - point.y * height }, thickness: annotation.strokeWidth || 3, color, opacity });
      });
    }
  }

  return pdfDoc.save();
}

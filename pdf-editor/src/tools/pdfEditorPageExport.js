import { degrees, PDFDocument } from "pdf-lib";

function normalizedRotation(value) {
  return ((Number(value || 0) % 360) + 360) % 360;
}

export function canPreserveNativePdfDocument(sourcePdf, pages) {
  if (!sourcePdf || !Array.isArray(pages)) return false;
  const sourcePages = sourcePdf.getPages();
  if (pages.length !== sourcePages.length) return false;
  return pages.every((pageRecord, index) => (
    pageRecord.source === "pdf"
    && pageRecord.originalIndex === index
    && normalizedRotation(pageRecord.rotation) === 0
  ));
}

export async function createEditorExportDocument({ pdfBytes, pages, embedDataUrlImage }) {
  const sourcePdf = pdfBytes ? await PDFDocument.load(pdfBytes) : null;
  if (canPreserveNativePdfDocument(sourcePdf, pages)) {
    return { pdfDoc: sourcePdf, nativeSourcePreserved: true };
  }

  const pdfDoc = await PDFDocument.create();
  await appendEditorPages({ pdfDoc, sourcePdf, pages, embedDataUrlImage });
  return { pdfDoc, nativeSourcePreserved: false };
}

export function applyNativePdfFormAnnotation(pdfDoc, annotation) {
  if (!pdfDoc || annotation?.source !== "pdf-form" || !annotation.fieldName) return false;
  const field = pdfDoc.getForm().getFieldMaybe(annotation.fieldName);
  if (!field) return false;
  if (annotation.type === "checkbox" && typeof field.check === "function" && typeof field.uncheck === "function") {
    if (annotation.checked) field.check();
    else field.uncheck();
    return true;
  }
  if (annotation.type === "field" && typeof field.setText === "function") {
    field.setText(String(annotation.content || ""));
    return true;
  }
  return false;
}

export async function appendEditorPages({ pdfDoc, sourcePdf, pages, embedDataUrlImage }) {
  for (const pageRecord of pages) {
    if (sourcePdf && pageRecord.source === "pdf" && Number.isInteger(pageRecord.originalIndex)) {
      const [copiedPage] = await pdfDoc.copyPages(sourcePdf, [pageRecord.originalIndex]);
      const sourceRotation = copiedPage.getRotation()?.angle || 0;
      copiedPage.setRotation(degrees(normalizedRotation(sourceRotation + Number(pageRecord.rotation || 0))));
      pdfDoc.addPage(copiedPage);
      continue;
    }

    const fallbackPage = pdfDoc.addPage([612, Math.round(612 * ((pageRecord.height || 984) / (pageRecord.width || 760)))]);
    if (!pageRecord.image) continue;
    const pageImage = await embedDataUrlImage(pdfDoc, pageRecord.image);
    if (!pageImage) continue;
    const { width, height } = fallbackPage.getSize();
    fallbackPage.drawImage(pageImage, { x: 0, y: 0, width, height });
  }
}

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

function copyPdfMetadata(sourcePdf, outputPdf) {
  if (!sourcePdf || !outputPdf) return;
  const values = [
    ["getTitle", "setTitle"],
    ["getAuthor", "setAuthor"],
    ["getSubject", "setSubject"],
    ["getCreator", "setCreator"],
    ["getProducer", "setProducer"],
    ["getCreationDate", "setCreationDate"],
    ["getModificationDate", "setModificationDate"],
  ];
  values.forEach(([getter, setter]) => {
    try {
      const value = sourcePdf[getter]?.();
      if (value !== undefined && value !== null && value !== "") outputPdf[setter]?.(value);
    } catch {
      // Malformed metadata must not prevent a valid page export.
    }
  });
}

async function addRasterizedPage({ pdfDoc, pageRecord, replacement, embedDataUrlImage, index = null }) {
  const width = Number(replacement?.pdfWidth) || 612;
  const height = Number(replacement?.pdfHeight)
    || Math.round(width * ((pageRecord?.height || 984) / (pageRecord?.width || 760)));
  const page = index === null ? pdfDoc.addPage([width, height]) : pdfDoc.insertPage(index, [width, height]);
  const imageDataUrl = replacement?.image || pageRecord?.image;
  if (!imageDataUrl) return page;
  const image = await embedDataUrlImage(pdfDoc, imageDataUrl);
  if (image) page.drawImage(image, { x: 0, y: 0, width, height });
  return page;
}

async function replaceNativePages({ pdfDoc, pages, rebuiltPages, embedDataUrlImage }) {
  const rebuiltPageIndexes = new Set();
  const indexes = Array.from(rebuiltPages.keys()).sort((a, b) => a - b);
  for (const index of indexes) {
    if (index < 0 || index >= pdfDoc.getPageCount()) continue;
    await addRasterizedPage({
      pdfDoc,
      pageRecord: pages[index],
      replacement: rebuiltPages.get(index),
      embedDataUrlImage,
      index,
    });
    pdfDoc.removePage(index + 1);
    rebuiltPageIndexes.add(index);
  }
  return rebuiltPageIndexes;
}

export async function createEditorExportDocument({ pdfBytes, pages, embedDataUrlImage, rebuiltPages = new Map() }) {
  const sourcePdf = pdfBytes ? await PDFDocument.load(pdfBytes) : null;
  if (canPreserveNativePdfDocument(sourcePdf, pages)) {
    const rebuiltPageIndexes = await replaceNativePages({
      pdfDoc: sourcePdf,
      pages,
      rebuiltPages,
      embedDataUrlImage,
    });
    return { pdfDoc: sourcePdf, nativeSourcePreserved: true, rebuiltPageIndexes };
  }

  const pdfDoc = await PDFDocument.create();
  copyPdfMetadata(sourcePdf, pdfDoc);
  await appendEditorPages({ pdfDoc, sourcePdf, pages, embedDataUrlImage, rebuiltPages });
  return { pdfDoc, nativeSourcePreserved: false, rebuiltPageIndexes: new Set(rebuiltPages.keys()) };
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

export async function appendEditorPages({ pdfDoc, sourcePdf, pages, embedDataUrlImage, rebuiltPages = new Map() }) {
  for (let outputIndex = 0; outputIndex < pages.length; outputIndex += 1) {
    const pageRecord = pages[outputIndex];
    if (rebuiltPages.has(outputIndex)) {
      await addRasterizedPage({
        pdfDoc,
        pageRecord,
        replacement: rebuiltPages.get(outputIndex),
        embedDataUrlImage,
      });
      continue;
    }
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

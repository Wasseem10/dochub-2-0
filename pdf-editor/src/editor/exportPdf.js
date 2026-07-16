import { PDFDocument, degrees } from "pdf-lib";

async function embedPreviewImage(pdfDocument, dataUrl) {
  if (!dataUrl) return null;
  const response = await fetch(dataUrl);
  const bytes = await response.arrayBuffer();
  if (dataUrl.startsWith("data:image/png")) return pdfDocument.embedPng(bytes);
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) return pdfDocument.embedJpg(bytes);
  return null;
}

export async function consolidatePdfSources({ baseBytes, pages, appendBytes }) {
  const output = await PDFDocument.create();
  const base = baseBytes ? await PDFDocument.load(baseBytes) : null;
  for (const pageRecord of pages) {
    if (base && pageRecord.source === "pdf" && Number.isInteger(pageRecord.originalIndex)) {
      const [copiedPage] = await output.copyPages(base, [pageRecord.originalIndex]);
      if (pageRecord.rotation) copiedPage.setRotation(degrees((copiedPage.getRotation().angle + pageRecord.rotation) % 360));
      output.addPage(copiedPage);
      continue;
    }
    const fallback = output.addPage([612, Math.round(612 * ((pageRecord.height || 984) / (pageRecord.width || 760)))]);
    if (pageRecord.rotation) fallback.setRotation(degrees(pageRecord.rotation));
    const preview = await embedPreviewImage(output, pageRecord.image);
    if (preview) {
      const size = fallback.getSize();
      fallback.drawImage(preview, { x: 0, y: 0, width: size.width, height: size.height });
    }
  }
  const appended = await PDFDocument.load(appendBytes);
  const appendedPages = await output.copyPages(appended, appended.getPageIndices());
  appendedPages.forEach((page) => output.addPage(page));
  return output.save();
}

export async function finalizePdfExport(pdfDocument, fileName) {
  const bytes = await pdfDocument.save();
  const name = `${String(fileName || "document.pdf").replace(/\.pdf$/i, "")}-edited.pdf`;
  return {
    bytes,
    name,
    blob: new Blob([bytes], { type: "application/pdf" }),
  };
}

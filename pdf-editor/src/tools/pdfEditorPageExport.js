import { degrees } from "pdf-lib";

function normalizedRotation(value) {
  return ((Number(value || 0) % 360) + 360) % 360;
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

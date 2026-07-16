import { PDFDocument } from "pdf-lib";

/**
 * Builds a compact PDF from JPEG-rendered pages. Rendering happens in the browser UI so
 * this primitive remains deterministic and does not require any server-side processing.
 * @param {{jpegBytes: Uint8Array | ArrayBuffer, width: number, height: number}[]} pages
 */
export async function createCompressedPdfFromJpegs(pages) {
  if (!Array.isArray(pages) || !pages.length) throw new Error("No rendered pages are available to compress.");
  const pdf = await PDFDocument.create();
  for (const pageRecord of pages) {
    const width = Number(pageRecord.width);
    const height = Number(pageRecord.height);
    const jpegBytes = pageRecord.jpegBytes instanceof Uint8Array ? pageRecord.jpegBytes : new Uint8Array(pageRecord.jpegBytes || []);
    if (!Number.isFinite(width) || width < 1 || !Number.isFinite(height) || height < 1 || !jpegBytes.length) throw new Error("A rendered PDF page is invalid.");
    const image = await pdf.embedJpg(jpegBytes);
    const page = pdf.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
  }
  pdf.setTitle("Compressed PDF");
  pdf.setCreator("FixThatPDF");
  return pdf.save({ useObjectStreams: true });
}

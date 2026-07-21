import { PDFDocument } from "pdf-lib";

export const FLATTEN_PDF_LIMITS = Object.freeze({
  maxBytes: 25 * 1024 * 1024,
  maxPages: 50,
  renderScale: 2,
});

function canvasToJpegBytes(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(async (blob) => {
    if (!blob) return reject(new Error("A flattened page could not be encoded."));
    resolve(new Uint8Array(await blob.arrayBuffer()));
  }, "image/jpeg", 0.95));
}

export async function flattenPdfBytes(sourceBytes, options = {}) {
  if (!sourceBytes?.byteLength) throw new Error("Choose a PDF to flatten.");
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
  const source = await pdfjsLib.getDocument({ data: sourceBytes.slice ? sourceBytes.slice(0) : sourceBytes }).promise;
  if (source.numPages > FLATTEN_PDF_LIMITS.maxPages) {
    await source.destroy?.();
    throw new Error(`Flatten PDF supports up to ${FLATTEN_PDF_LIMITS.maxPages} pages.`);
  }

  const output = await PDFDocument.create();
  output.setTitle("Flattened document");
  output.setCreator("FixThatPDF");
  output.setProducer("FixThatPDF browser flattening");
  const renderScale = options.renderScale || FLATTEN_PDF_LIMITS.renderScale;

  for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
    const sourcePage = await source.getPage(pageNumber);
    const pageViewport = sourcePage.getViewport({ scale: 1 });
    const renderViewport = sourcePage.getViewport({ scale: renderScale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(renderViewport.width));
    canvas.height = Math.max(1, Math.ceil(renderViewport.height));
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await sourcePage.render({ canvasContext: context, viewport: renderViewport, background: "#fff" }).promise;
    const image = await output.embedJpg(await canvasToJpegBytes(canvas));
    const page = output.addPage([pageViewport.width, pageViewport.height]);
    page.drawImage(image, { x: 0, y: 0, width: pageViewport.width, height: pageViewport.height });
    options.onProgress?.({ completed: pageNumber, total: source.numPages });
    sourcePage.cleanup();
    canvas.width = 1;
    canvas.height = 1;
  }

  await source.destroy?.();
  return output.save({ useObjectStreams: false, addDefaultPage: false });
}

import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.mjs";
import { isUsableRedaction, redactionsForPage } from "./permanentRedactionGeometry.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

export const PERMANENT_REDACTION_LIMITS = Object.freeze({
  maxBytes: 20 * 1024 * 1024,
  maxPages: 50,
  renderScale: 2,
});

function canvasToJpegBytes(canvas, quality = 0.94) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("The browser could not encode a redacted page."));
        return;
      }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, "image/jpeg", quality);
  });
}

/**
 * Rebuilds the complete PDF from rendered pixels before applying redaction marks.
 * No source content streams, text, links, forms, layers, attachments, JavaScript,
 * or metadata are copied to the output document.
 */
export async function applyPermanentRedactions(sourceBytes, redactions, options = {}) {
  if (!sourceBytes?.byteLength) throw new Error("Choose a PDF before applying redactions.");
  if (!redactions.some(isUsableRedaction)) throw new Error("Mark at least one area to redact.");

  const renderScale = options.renderScale || PERMANENT_REDACTION_LIMITS.renderScale;
  const source = await pdfjsLib.getDocument({ data: sourceBytes.slice ? sourceBytes.slice(0) : sourceBytes }).promise;
  if (source.numPages > PERMANENT_REDACTION_LIMITS.maxPages) {
    throw new Error(`Permanent redaction supports up to ${PERMANENT_REDACTION_LIMITS.maxPages} pages.`);
  }

  const output = await PDFDocument.create();
  output.setTitle("Redacted document");
  output.setProducer("PDFArrow permanent redaction");
  output.setCreator("PDFArrow");
  output.setSubject("Flattened PDF with permanent redactions");
  output.setKeywords(["redacted", "flattened"]);

  for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
    const sourcePage = await source.getPage(pageNumber);
    const outputViewport = sourcePage.getViewport({ scale: 1 });
    const renderViewport = sourcePage.getViewport({ scale: renderScale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(renderViewport.width));
    canvas.height = Math.max(1, Math.ceil(renderViewport.height));
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await sourcePage.render({ canvasContext: context, viewport: renderViewport, background: "#ffffff" }).promise;

    redactionsForPage(redactions, pageNumber - 1).forEach((redaction) => {
      context.save();
      context.fillStyle = "#000000";
      context.fillRect(
        Math.floor(redaction.x * canvas.width),
        Math.floor(redaction.y * canvas.height),
        Math.ceil(redaction.width * canvas.width),
        Math.ceil(redaction.height * canvas.height),
      );
      context.restore();
    });

    const imageBytes = await canvasToJpegBytes(canvas);
    const image = await output.embedJpg(imageBytes);
    const page = output.addPage([outputViewport.width, outputViewport.height]);
    page.drawImage(image, { x: 0, y: 0, width: outputViewport.width, height: outputViewport.height });
    options.onProgress?.({ completed: pageNumber, total: source.numPages });
    sourcePage.cleanup();
    canvas.width = 1;
    canvas.height = 1;
  }

  if (typeof source.destroy === "function") await source.destroy();
  return output.save({ useObjectStreams: false, addDefaultPage: false });
}

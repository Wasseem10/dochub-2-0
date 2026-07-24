import { PDFDocument } from "pdf-lib";

export const STRUCTURE_PRESERVING_COMPRESSION_PRESETS = Object.freeze({
  lossless: Object.freeze({ optimizeImages: false }),
  balanced: Object.freeze({ optimizeImages: true }),
});

export const PDF_COMPRESSION_PRESETS = Object.freeze({
  lossless: Object.freeze({
    label: "Lossless cleanup",
    detail: "Keeps selectable text, vectors, links, forms, layers, and original image quality.",
    impact: "No intentional visual loss",
    structurePreserving: true,
  }),
  balanced: Object.freeze({
    label: "Balanced",
    detail: "Keeps PDF features while recompressing eligible image and object streams.",
    impact: "Low visual impact",
    structurePreserving: true,
  }),
  maximum: Object.freeze({
    label: "Maximum reduction",
    detail: "Flattens each page to a smaller JPEG image for image-heavy delivery copies.",
    impact: "Visible softening; removes searchable and interactive structure",
    structurePreserving: false,
    scale: 0.85,
    quality: 0.48,
  }),
});

export function compressionSavings(originalBytes, compressedBytes) {
  const original = Math.max(0, Number(originalBytes) || 0);
  const compressed = Math.max(0, Number(compressedBytes) || 0);
  const savedBytes = Math.max(0, original - compressed);
  const savedPercent = original ? savedBytes / original * 100 : 0;
  return {
    originalBytes: original,
    compressedBytes: compressed,
    savedBytes,
    savedPercent,
    smaller: compressed > 0 && compressed < original,
  };
}

export function buildStructurePreservingCompressionArgs(preset = "balanced", inputName = "input.pdf", outputName = "compressed.pdf") {
  const profile = STRUCTURE_PRESERVING_COMPRESSION_PRESETS[preset];
  if (!profile) throw new Error("Choose a supported structure-preserving compression level.");
  return [
    "--object-streams=generate",
    "--stream-data=compress",
    "--recompress-flate",
    "--compression-level=9",
    "--remove-unreferenced-resources=yes",
    ...(profile.optimizeImages ? [
      "--optimize-images",
      "--oi-min-width=180",
      "--oi-min-height=180",
      "--oi-min-area=50000",
    ] : []),
    "--",
    inputName,
    outputName,
  ];
}

/** Rewrites a PDF without rendering it, preserving its interactive structure. */
export async function compressPdfPreservingStructure(input, preset = "balanced") {
  if (!(input instanceof Uint8Array) || !input.length) throw new Error("A PDF is required for compression.");
  const { createQpdfRunner } = await import("qpdf-run");
  const runner = await createQpdfRunner({
    workerUrl: new URL("qpdf-run/worker", import.meta.url).href,
    qpdfJsUrl: new URL("qpdf-run/qpdf.js", import.meta.url).href,
    wasmUrl: new URL("qpdf-run/qpdf.wasm", import.meta.url).href,
    timeoutMs: 90000,
  });
  try {
    return await runner.runOne({
      input,
      inputName: "input.pdf",
      outputName: "compressed.pdf",
      args: buildStructurePreservingCompressionArgs(preset),
    });
  } finally {
    await runner.destroy();
  }
}

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
  pdf.setCreator("PDFArrow");
  return pdf.save({ useObjectStreams: true });
}

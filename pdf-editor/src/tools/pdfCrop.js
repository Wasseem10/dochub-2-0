import { PDFDocument } from "pdf-lib";

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

function selectedPageIndices(selectedPages, pageCount) {
  const indices = selectedPages == null ? Array.from({ length: pageCount }, (_, index) => index) : [...new Set(selectedPages.map(Number))];
  if (!indices.length) throw new Error("Select at least one page to crop.");
  if (indices.some((index) => !Number.isInteger(index) || index < 0 || index >= pageCount)) throw new Error("The crop selection includes a page that does not exist.");
  return indices;
}

function cropBounds(page) {
  const crop = page.getCropBox?.();
  if (crop && crop.width > 0 && crop.height > 0) return crop;
  const media = page.getMediaBox();
  return { x: media.x, y: media.y, width: media.width, height: media.height };
}

/**
 * Sets CropBox boundaries on selected PDF pages without rasterizing their original content.
 * Values are percentages of each page's current visible bounds.
 * @param {Uint8Array | ArrayBuffer} sourceBytes
 * @param {{selectedPages?: number[], top?: number, right?: number, bottom?: number, left?: number}} options
 */
export async function cropPdfPages(sourceBytes, options = {}) {
  const pdf = await PDFDocument.load(sourceBytes, { updateMetadata: false });
  const pages = pdf.getPages();
  const selectedPages = selectedPageIndices(options.selectedPages, pages.length);
  const top = clamp(options.top ?? 0, 0, 45) / 100;
  const right = clamp(options.right ?? 0, 0, 45) / 100;
  const bottom = clamp(options.bottom ?? 0, 0, 45) / 100;
  const left = clamp(options.left ?? 0, 0, 45) / 100;

  if (left + right >= 0.9 || top + bottom >= 0.9) throw new Error("Leave at least 10% of each page visible.");

  selectedPages.forEach((index) => {
    const page = pages[index];
    const bounds = cropBounds(page);
    const x = bounds.x + bounds.width * left;
    const y = bounds.y + bounds.height * bottom;
    const width = bounds.width * (1 - left - right);
    const height = bounds.height * (1 - top - bottom);
    if (width < 36 || height < 36) throw new Error("The crop would leave a page smaller than 0.5 inches.");
    page.setCropBox(x, y, width, height);
  });

  pdf.setTitle("Cropped PDF");
  pdf.setCreator("PDFArrow");
  return pdf.save();
}

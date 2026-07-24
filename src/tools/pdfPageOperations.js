import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";

export const PAGE_TOOL_LIMITS = Object.freeze({
  maxFileBytes: 50 * 1024 * 1024,
  maxFiles: 20,
  maxPages: 200,
});

function normalizeRotation(value) {
  return ((Number(value || 0) % 360) + 360) % 360;
}

export function parsePageRanges(value, pageCount) {
  const input = String(value || "").trim();
  if (!input) throw new Error("Enter at least one page or range, such as 1-3, 5.");
  const ranges = input.split(",").map((part) => part.trim()).filter(Boolean).map((part) => {
    const match = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error(`“${part}” is not a valid page range.`);
    const start = Number(match[1]);
    const end = Number(match[2] || match[1]);
    if (start < 1 || end < start || end > pageCount) throw new Error(`Range ${part} must stay between pages 1 and ${pageCount}.`);
    return Array.from({ length: end - start + 1 }, (_, index) => start - 1 + index);
  });
  return ranges;
}

export async function inspectPdfBytes(bytes) {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  return { pageCount: pdf.getPageCount(), title: pdf.getTitle() || "" };
}

export async function mergePdfDocuments(documents) {
  if (!Array.isArray(documents) || documents.length < 2) throw new Error("Choose at least two PDFs to merge.");
  if (documents.length > PAGE_TOOL_LIMITS.maxFiles) throw new Error(`Merge no more than ${PAGE_TOOL_LIMITS.maxFiles} PDFs at once.`);
  const output = await PDFDocument.create();
  let totalPages = 0;
  for (const documentRecord of documents) {
    const source = await PDFDocument.load(documentRecord.bytes, { updateMetadata: false });
    totalPages += source.getPageCount();
    if (totalPages > PAGE_TOOL_LIMITS.maxPages) throw new Error(`The merged PDF may contain no more than ${PAGE_TOOL_LIMITS.maxPages} pages.`);
    const copied = await output.copyPages(source, source.getPageIndices());
    copied.forEach((page) => output.addPage(page));
  }
  output.setTitle("Merged PDF");
  output.setCreator("PDFArrow");
  return output.save();
}

export async function buildPdfFromPagePlan(sourceBytes, pagePlan, title = "Organized PDF") {
  if (!Array.isArray(pagePlan) || pagePlan.length === 0) throw new Error("Keep at least one page in the PDF.");
  if (pagePlan.length > PAGE_TOOL_LIMITS.maxPages) throw new Error(`The output may contain no more than ${PAGE_TOOL_LIMITS.maxPages} pages.`);
  const source = await PDFDocument.load(sourceBytes, { updateMetadata: false });
  const sourceCount = source.getPageCount();
  const output = await PDFDocument.create();

  for (const planItem of pagePlan) {
    const sourceIndex = Number(planItem.sourceIndex);
    if (!Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= sourceCount) throw new Error("The page order references a page that does not exist.");
    const [page] = await output.copyPages(source, [sourceIndex]);
    const sourceRotation = normalizeRotation(page.getRotation()?.angle || 0);
    page.setRotation(degrees(normalizeRotation(sourceRotation + Number(planItem.rotation || 0))));
    output.addPage(page);
  }

  output.setTitle(title);
  output.setCreator("PDFArrow");
  return output.save();
}

export async function extractPdfPages(sourceBytes, pageIndices) {
  const unique = [...new Set(pageIndices)].sort((a, b) => a - b);
  return buildPdfFromPagePlan(sourceBytes, unique.map((sourceIndex) => ({ sourceIndex, rotation: 0 })), "Extracted PDF pages");
}

export async function splitPdfByRanges(sourceBytes, rangeGroups) {
  if (!Array.isArray(rangeGroups) || !rangeGroups.length) throw new Error("Add at least one split range.");
  const outputs = [];
  for (let index = 0; index < rangeGroups.length; index += 1) {
    const pageIndices = rangeGroups[index];
    const bytes = await buildPdfFromPagePlan(sourceBytes, pageIndices.map((sourceIndex) => ({ sourceIndex, rotation: 0 })), `Split PDF part ${index + 1}`);
    const pageLabel = pageIndices.length === 1
      ? `page-${pageIndices[0] + 1}`
      : `pages-${pageIndices[0] + 1}-${pageIndices[pageIndices.length - 1] + 1}`;
    outputs.push({ name: `${pageLabel}.pdf`, bytes });
  }
  return outputs;
}

export async function addPageNumbersToPdf(sourceBytes, options = {}) {
  const {
    position = "bottom-center",
    startAt = 1,
    fontSize = 12,
    margin = 28,
  } = options;
  const safeStart = Number(startAt);
  const safeSize = Number(fontSize);
  if (!Number.isInteger(safeStart) || safeStart < 0 || safeStart > 999999) throw new Error("The starting page number must be a whole number between 0 and 999999.");
  if (!Number.isFinite(safeSize) || safeSize < 8 || safeSize > 36) throw new Error("Page number size must be between 8 and 36 points.");

  const [vertical, horizontal] = String(position).split("-");
  if (!["top", "bottom"].includes(vertical) || !["left", "center", "right"].includes(horizontal)) throw new Error("Choose a valid page-number position.");

  const pdf = await PDFDocument.load(sourceBytes, { updateMetadata: false });
  if (pdf.getPageCount() > PAGE_TOOL_LIMITS.maxPages) throw new Error(`The PDF may contain no more than ${PAGE_TOOL_LIMITS.maxPages} pages.`);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const color = rgb(0.12, 0.2, 0.18);

  pdf.getPages().forEach((page, index) => {
    const label = String(safeStart + index);
    const labelWidth = font.widthOfTextAtSize(label, safeSize);
    const { width, height } = page.getSize();
    const x = horizontal === "left" ? margin : horizontal === "right" ? width - margin - labelWidth : (width - labelWidth) / 2;
    const y = vertical === "top" ? height - margin - safeSize : margin;
    page.drawText(label, { x, y, size: safeSize, font, color });
  });

  pdf.setTitle("Numbered PDF");
  pdf.setCreator("PDFArrow");
  return pdf.save();
}

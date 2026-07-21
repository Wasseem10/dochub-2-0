import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const PDF_COMPARISON_LIMITS = Object.freeze({
  maxBytes: 25 * 1024 * 1024,
  maxPages: 75,
  renderWidth: 820,
  tileSize: 28,
});

export function validateComparisonPdf(file) {
  if (!file) return "Choose a PDF file.";
  if (!file.size) return "This PDF is empty.";
  if (file.size > PDF_COMPARISON_LIMITS.maxBytes) return "Choose a PDF no larger than 25 MB.";
  if (file.type !== "application/pdf" && !String(file.name || "").toLowerCase().endsWith(".pdf")) return "Choose a PDF file.";
  return "";
}

export function compareRgbaImages(first, second, width, height, options = {}) {
  const tileSize = options.tileSize || PDF_COMPARISON_LIMITS.tileSize;
  const threshold = options.threshold ?? 24;
  const minimumRatio = options.minimumRatio ?? 0.035;
  const rects = [];
  let changedSamples = 0;
  let samples = 0;
  for (let top = 0; top < height; top += tileSize) {
    for (let left = 0; left < width; left += tileSize) {
      const right = Math.min(width, left + tileSize);
      const bottom = Math.min(height, top + tileSize);
      let tileChanged = 0;
      let tileSamples = 0;
      for (let y = top; y < bottom; y += 2) {
        for (let x = left; x < right; x += 2) {
          const offset = (y * width + x) * 4;
          const delta = (Math.abs(first[offset] - second[offset]) + Math.abs(first[offset + 1] - second[offset + 1]) + Math.abs(first[offset + 2] - second[offset + 2])) / 3;
          if (delta >= threshold) { tileChanged += 1; changedSamples += 1; }
          tileSamples += 1; samples += 1;
        }
      }
      if (tileSamples && tileChanged / tileSamples >= minimumRatio) rects.push({ x: left / width, y: top / height, width: (right - left) / width, height: (bottom - top) / height });
    }
  }
  const changedRatio = samples ? changedSamples / samples : 0;
  return { rects, changedRatio, similarity: Math.max(0, Math.round((1 - changedRatio) * 1000) / 10) };
}

export function compareTextStrings(first = "", second = "") {
  const tokens = (value) => String(value).toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const counts = (items) => items.reduce((map, item) => map.set(item, (map.get(item) || 0) + 1), new Map());
  const firstCounts = counts(tokens(first));
  const secondCounts = counts(tokens(second));
  let removed = 0;
  let added = 0;
  firstCounts.forEach((count, token) => { removed += Math.max(0, count - (secondCounts.get(token) || 0)); });
  secondCounts.forEach((count, token) => { added += Math.max(0, count - (firstCounts.get(token) || 0)); });
  return { added, removed, changed: added + removed };
}

function safeText(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "?");
}

export async function createComparisonPdfReport(pages, { firstName = "Original.pdf", secondName = "Revised.pdf" } = {}) {
  if (!pages?.length) throw new Error("Run a comparison before downloading the report.");
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const reportWidth = 1000;
  const reportHeight = 650;
  for (const result of pages) {
    const page = pdf.addPage([reportWidth, reportHeight]);
    page.drawText(`Comparison page ${result.pageNumber}`, { x: 34, y: 617, size: 17, font: bold, color: rgb(0.08, 0.12, 0.22) });
    page.drawText(`${result.statusLabel} · ${result.similarity.toFixed(1)}% visually similar · +${result.textAdded} / -${result.textRemoved} words`, { x: 34, y: 596, size: 9.5, font: regular, color: rgb(0.35, 0.4, 0.5) });
    const slots = [{ bytes: result.firstPng, x: 34, name: firstName }, { bytes: result.secondPng, x: 512, name: secondName }];
    for (const slot of slots) {
      page.drawText(safeText(slot.name).slice(0, 70), { x: slot.x, y: 570, size: 9, font: bold, color: rgb(0.12, 0.18, 0.3) });
      const frame = { x: slot.x, y: 38, width: 454, height: 518 };
      page.drawRectangle({ ...frame, color: rgb(0.97, 0.98, 1), borderColor: rgb(0.76, 0.8, 0.88), borderWidth: 0.8 });
      if (!slot.bytes) {
        page.drawText("Page not present", { x: frame.x + 165, y: frame.y + frame.height / 2, size: 13, font: bold, color: rgb(0.55, 0.58, 0.65) });
        continue;
      }
      const image = await pdf.embedPng(slot.bytes);
      const ratio = Math.min(frame.width / image.width, frame.height / image.height);
      const width = image.width * ratio;
      const height = image.height * ratio;
      const imageX = frame.x + (frame.width - width) / 2;
      const imageY = frame.y + (frame.height - height) / 2;
      page.drawImage(image, { x: imageX, y: imageY, width, height });
      for (const rect of result.rects || []) {
        page.drawRectangle({ x: imageX + rect.x * width, y: imageY + (1 - rect.y - rect.height) * height, width: rect.width * width, height: rect.height * height, borderColor: rgb(0.9, 0.08, 0.12), borderWidth: 1.2, opacity: 0.12, color: rgb(1, 0.75, 0.76) });
      }
    }
  }
  pdf.setTitle("PDF comparison report");
  pdf.setCreator("FixThatPDF");
  pdf.setProducer("FixThatPDF browser comparison");
  return pdf.save();
}

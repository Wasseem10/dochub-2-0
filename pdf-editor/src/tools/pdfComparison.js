import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const PDF_COMPARISON_LIMITS = Object.freeze({
  maxBytes: 25 * 1024 * 1024,
  maxPages: 75,
  renderWidth: 820,
  tileSize: 28,
});

function mergeRegionPair(first, second) {
  return {
    left: Math.min(first.left, second.left),
    top: Math.min(first.top, second.top),
    right: Math.max(first.right, second.right),
    bottom: Math.max(first.bottom, second.bottom),
    tileCount: first.tileCount + second.tileCount,
    peakRatio: Math.max(first.peakRatio, second.peakRatio),
  };
}

function regionGap(first, second, tileSize) {
  const horizontal = Math.max(0, first.left - second.right, second.left - first.right);
  const vertical = Math.max(0, first.top - second.bottom, second.top - first.bottom);
  const merged = mergeRegionPair(first, second);
  const mergedArea = (merged.right - merged.left) * (merged.bottom - merged.top);
  const firstArea = (first.right - first.left) * (first.bottom - first.top);
  const secondArea = (second.right - second.left) * (second.bottom - second.top);
  const emptyAreaPenalty = Math.max(0, mergedArea - firstArea - secondArea) / Math.max(1, tileSize * tileSize);
  return horizontal / tileSize + vertical / tileSize + emptyAreaPenalty * 0.12;
}

function limitRegions(regions, limit, tileSize) {
  const limited = [...regions];
  while (limited.length > limit) {
    let best = null;
    for (let firstIndex = 0; firstIndex < limited.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < limited.length; secondIndex += 1) {
        const gap = regionGap(limited[firstIndex], limited[secondIndex], tileSize);
        if (!best || gap < best.gap) best = { firstIndex, secondIndex, gap };
      }
    }
    if (!best) break;
    const merged = mergeRegionPair(limited[best.firstIndex], limited[best.secondIndex]);
    limited.splice(best.secondIndex, 1);
    limited.splice(best.firstIndex, 1, merged);
  }
  return limited;
}

function groupChangedTiles(changedTiles, rows, width, height, tileSize, options) {
  if (!changedTiles.length) return [];
  const maxRegions = options.maxRegions ?? 24;
  const padding = options.regionPadding ?? Math.max(3, Math.round(tileSize * 0.18));
  const retainedByRow = new Map();
  changedTiles.forEach((tile) => {
    const rowTiles = retainedByRow.get(tile.row) || [];
    rowTiles.push(tile);
    retainedByRow.set(tile.row, rowTiles);
  });

  const regions = [];
  for (let row = 0; row < rows; row += 1) {
    const rowTiles = (retainedByRow.get(row) || []).sort((first, second) => first.column - second.column);
    const runs = [];
    for (const tile of rowTiles) {
      const previous = runs[runs.length - 1];
      if (previous && tile.column === previous.lastColumn + 1) {
        previous.lastColumn = tile.column;
        previous.tileCount += 1;
        previous.peakRatio = Math.max(previous.peakRatio, tile.ratio);
      } else {
        runs.push({ firstColumn: tile.column, lastColumn: tile.column, tileCount: 1, peakRatio: tile.ratio });
      }
    }

    for (const run of runs) {
      const runLeft = run.firstColumn * tileSize;
      const runRight = Math.min(width, (run.lastColumn + 1) * tileSize);
      const runWidth = runRight - runLeft;
      let bestRegion = null;
      let bestOverlap = 0;
      for (const region of regions) {
        if (region.lastRow !== row - 1) continue;
        const overlap = Math.max(0, Math.min(region.right, runRight) - Math.max(region.left, runLeft));
        const overlapRatio = overlap / Math.max(1, Math.min(region.right - region.left, runWidth));
        const unionWidth = Math.max(region.right, runRight) - Math.min(region.left, runLeft);
        if (overlapRatio >= 0.5 && unionWidth <= Math.max(region.right - region.left, runWidth) * 1.65 && overlapRatio > bestOverlap) {
          bestRegion = region;
          bestOverlap = overlapRatio;
        }
      }
      if (bestRegion) {
        bestRegion.left = Math.min(bestRegion.left, runLeft);
        bestRegion.right = Math.max(bestRegion.right, runRight);
        bestRegion.bottom = Math.min(height, (row + 1) * tileSize);
        bestRegion.lastRow = row;
        bestRegion.tileCount += run.tileCount;
        bestRegion.peakRatio = Math.max(bestRegion.peakRatio, run.peakRatio);
      } else {
        regions.push({
          left: runLeft,
          top: row * tileSize,
          right: runRight,
          bottom: Math.min(height, (row + 1) * tileSize),
          lastRow: row,
          tileCount: run.tileCount,
          peakRatio: run.peakRatio,
        });
      }
    }
  }

  return limitRegions(regions, maxRegions, tileSize)
    .map((region) => {
      const left = Math.max(0, region.left - padding);
      const top = Math.max(0, region.top - padding);
      const right = Math.min(width, region.right + padding);
      const bottom = Math.min(height, region.bottom + padding);
      return { x: left / width, y: top / height, width: (right - left) / width, height: (bottom - top) / height };
    })
    .sort((first, second) => first.y - second.y || first.x - second.x);
}

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
  const minimumRatio = options.minimumRatio ?? 0.015;
  const rows = Math.ceil(height / tileSize);
  const changedTiles = [];
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
      const ratio = tileSamples ? tileChanged / tileSamples : 0;
      if (ratio >= minimumRatio) changedTiles.push({ row: Math.floor(top / tileSize), column: Math.floor(left / tileSize), ratio });
    }
  }
  const changedRatio = samples ? changedSamples / samples : 0;
  const rects = groupChangedTiles(changedTiles, rows, width, height, tileSize, { ...options, minimumRatio });
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

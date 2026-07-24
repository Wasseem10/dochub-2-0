import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const PDF_COMPARISON_LIMITS = Object.freeze({
  maxBytes: 25 * 1024 * 1024,
  maxPages: 75,
  renderWidth: 820,
  tileSize: 28,
});

const WORD_PATTERN = /[\p{L}\p{N}]+(?:[’'._@:/+-][\p{L}\p{N}]+)*/gu;

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function normalizedWord(value) {
  return String(value || "").normalize("NFKC").toLocaleLowerCase();
}

export function extractPositionedWords(textContent, viewport) {
  const words = [];
  for (const item of textContent?.items || []) {
    const source = String(item?.str || "");
    const matches = [...source.matchAll(WORD_PATTERN)];
    if (!matches.length) continue;
    const transform = item.transform || [];
    const [originX, originY] = viewport.convertToViewportPoint(Number(transform[4] || 0), Number(transform[5] || 0));
    const itemWidth = Math.max(1, Math.abs(Number(item.width || 0)));
    const fontHeight = Math.max(4, Math.abs(Number(item.height || Math.hypot(Number(transform[2] || 0), Number(transform[3] || 0)) || 8)));
    for (const match of matches) {
      const startRatio = (match.index || 0) / Math.max(1, source.length);
      const widthRatio = match[0].length / Math.max(1, source.length);
      words.push({
        text: match[0],
        normalized: normalizedWord(match[0]),
        x: clamp01((originX + itemWidth * startRatio) / viewport.width),
        y: clamp01((originY - fontHeight * 1.05) / viewport.height),
        width: Math.max(0.002, Math.min(1, itemWidth * widthRatio / viewport.width)),
        height: Math.max(0.004, Math.min(1, fontHeight * 1.25 / viewport.height)),
      });
    }
  }
  return words;
}

function buildWordOperations(firstWords, secondWords) {
  const firstLength = firstWords.length;
  const secondLength = secondWords.length;
  const columns = secondLength + 1;
  const cellCount = (firstLength + 1) * columns;

  if (cellCount > 6_000_000) {
    const operations = [];
    let prefix = 0;
    while (prefix < firstLength && prefix < secondLength && firstWords[prefix].normalized === secondWords[prefix].normalized) {
      operations.push({ type: "equal", first: firstWords[prefix], second: secondWords[prefix] });
      prefix += 1;
    }
    let firstSuffix = firstLength - 1;
    let secondSuffix = secondLength - 1;
    const suffix = [];
    while (firstSuffix >= prefix && secondSuffix >= prefix && firstWords[firstSuffix].normalized === secondWords[secondSuffix].normalized) {
      suffix.unshift({ type: "equal", first: firstWords[firstSuffix], second: secondWords[secondSuffix] });
      firstSuffix -= 1;
      secondSuffix -= 1;
    }
    for (let index = prefix; index <= firstSuffix; index += 1) operations.push({ type: "delete", first: firstWords[index] });
    for (let index = prefix; index <= secondSuffix; index += 1) operations.push({ type: "insert", second: secondWords[index] });
    return [...operations, ...suffix];
  }

  const matrix = new Uint16Array(cellCount);
  for (let firstIndex = firstLength - 1; firstIndex >= 0; firstIndex -= 1) {
    const row = firstIndex * columns;
    const nextRow = (firstIndex + 1) * columns;
    for (let secondIndex = secondLength - 1; secondIndex >= 0; secondIndex -= 1) {
      matrix[row + secondIndex] = firstWords[firstIndex].normalized === secondWords[secondIndex].normalized
        ? matrix[nextRow + secondIndex + 1] + 1
        : Math.max(matrix[nextRow + secondIndex], matrix[row + secondIndex + 1]);
    }
  }

  const operations = [];
  let firstIndex = 0;
  let secondIndex = 0;
  while (firstIndex < firstLength || secondIndex < secondLength) {
    if (firstIndex < firstLength && secondIndex < secondLength && firstWords[firstIndex].normalized === secondWords[secondIndex].normalized) {
      operations.push({ type: "equal", first: firstWords[firstIndex], second: secondWords[secondIndex] });
      firstIndex += 1;
      secondIndex += 1;
    } else if (secondIndex >= secondLength || (firstIndex < firstLength && matrix[(firstIndex + 1) * columns + secondIndex] >= matrix[firstIndex * columns + secondIndex + 1])) {
      operations.push({ type: "delete", first: firstWords[firstIndex] });
      firstIndex += 1;
    } else {
      operations.push({ type: "insert", second: secondWords[secondIndex] });
      secondIndex += 1;
    }
  }
  return operations;
}

function rectsForWords(words) {
  if (!words.length) return [];
  const sorted = [...words].sort((first, second) => first.y - second.y || first.x - second.x);
  const lines = [];
  for (const word of sorted) {
    const centerY = word.y + word.height / 2;
    const line = lines.find((candidate) => Math.abs(candidate.centerY - centerY) <= Math.max(candidate.height, word.height) * 0.7);
    if (!line) {
      lines.push({ x: word.x, y: word.y, right: word.x + word.width, bottom: word.y + word.height, centerY, height: word.height });
      continue;
    }
    line.x = Math.min(line.x, word.x);
    line.y = Math.min(line.y, word.y);
    line.right = Math.max(line.right, word.x + word.width);
    line.bottom = Math.max(line.bottom, word.y + word.height);
    line.centerY = (line.y + line.bottom) / 2;
    line.height = line.bottom - line.y;
  }
  return lines.map((line) => ({
    x: clamp01(line.x - 0.003),
    y: clamp01(line.y - 0.002),
    width: Math.min(1 - clamp01(line.x - 0.003), line.right - line.x + 0.006),
    height: Math.min(1 - clamp01(line.y - 0.002), line.bottom - line.y + 0.004),
  }));
}

function changeText(words) {
  return words.map((word) => word.text).join(" ");
}

function buildWordChanges(operations, pageNumber) {
  const changes = [];
  let operationIndex = 0;
  while (operationIndex < operations.length) {
    if (operations[operationIndex].type === "equal") {
      operationIndex += 1;
      continue;
    }
    const removedWords = [];
    const addedWords = [];
    while (operationIndex < operations.length) {
      const operation = operations[operationIndex];
      if (operation.type === "delete") removedWords.push(operation.first);
      if (operation.type === "insert") addedWords.push(operation.second);
      operationIndex += 1;
      if (operationIndex >= operations.length || operations[operationIndex].type === "equal") break;
    }
    const type = removedWords.length && addedWords.length ? "replaced" : removedWords.length ? "deleted" : "inserted";
    changes.push({
      id: `page-${pageNumber}-change-${changes.length + 1}`,
      pageNumber,
      type,
      removedWords,
      addedWords,
      removedText: changeText(removedWords),
      addedText: changeText(addedWords),
      removedRects: rectsForWords(removedWords),
      addedRects: rectsForWords(addedWords),
    });
  }

  const consumed = new Set();
  for (let index = 0; index < changes.length; index += 1) {
    const change = changes[index];
    if (change.type !== "deleted" || change.removedWords.length < 2) continue;
    const key = change.removedWords.map((word) => word.normalized).join(" ");
    const movedIndex = changes.findIndex((candidate, candidateIndex) => candidateIndex > index && candidate.type === "inserted" && candidate.addedWords.map((word) => word.normalized).join(" ") === key);
    if (movedIndex < 0) continue;
    const moved = changes[movedIndex];
    change.type = "moved";
    change.addedWords = moved.addedWords;
    change.addedText = moved.addedText;
    change.addedRects = moved.addedRects;
    consumed.add(movedIndex);
  }
  return changes.filter((_, index) => !consumed.has(index)).map((change, index) => ({ ...change, id: `page-${pageNumber}-change-${index + 1}` }));
}

export function comparePositionedWords(firstWords = [], secondWords = [], { pageNumber = 1 } = {}) {
  const changes = buildWordChanges(buildWordOperations(firstWords, secondWords), pageNumber);
  const added = changes.reduce((total, change) => total + (change.type === "moved" ? 0 : change.addedWords.length), 0);
  const removed = changes.reduce((total, change) => total + (change.type === "moved" ? 0 : change.removedWords.length), 0);
  return { changes, added, removed, changed: changes.length };
}

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
    const changeCount = result.changes?.length || result.rects?.length || 0;
    page.drawText(`${result.statusLabel} · ${result.similarity.toFixed(1)}% visually similar · ${changeCount} ${changeCount === 1 ? "change" : "changes"} · +${result.textAdded} / -${result.textRemoved} words`, { x: 34, y: 596, size: 9.5, font: regular, color: rgb(0.35, 0.4, 0.5) });
    const slots = [{ bytes: result.firstPng, x: 34, name: firstName, side: "original" }, { bytes: result.secondPng, x: 512, name: secondName, side: "revised" }];
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
      const changeRects = (result.changes || []).flatMap((change) => {
        const rects = slot.side === "original" ? change.removedRects : change.addedRects;
        return (rects || []).map((rect) => ({ rect, type: change.type }));
      });
      const markedRects = changeRects.length
        ? changeRects
        : (result.rects || []).map((rect) => ({ rect, type: "visual" }));
      for (const { rect, type } of markedRects) {
        const isOriginal = slot.side === "original";
        const borderColor = type === "moved" ? rgb(0.08, 0.48, 0.42) : isOriginal ? rgb(0.83, 0.17, 0.2) : rgb(0.12, 0.38, 0.72);
        const fillColor = type === "moved" ? rgb(0.72, 0.93, 0.86) : isOriginal ? rgb(1, 0.77, 0.79) : rgb(0.73, 0.86, 0.98);
        page.drawRectangle({ x: imageX + rect.x * width, y: imageY + (1 - rect.y - rect.height) * height, width: rect.width * width, height: rect.height * height, borderColor, borderWidth: 0.8, opacity: 0.22, color: fillColor });
      }
    }
  }
  pdf.setTitle("PDF comparison report");
  pdf.setCreator("PDFArrow");
  pdf.setProducer("PDFArrow browser comparison");
  return pdf.save();
}

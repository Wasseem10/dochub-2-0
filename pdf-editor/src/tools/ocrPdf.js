import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const OCR_PDF_LIMITS = Object.freeze({
  maxInputBytes: 20 * 1024 * 1024,
  maxPages: 24,
  renderScale: 2.2,
  maxRenderPixels: 10_000_000,
});

export const OCR_LANGUAGES = Object.freeze([
  { value: "eng", label: "English" },
  { value: "spa", label: "Spanish" },
  { value: "fra", label: "French" },
  { value: "deu", label: "German" },
  { value: "ita", label: "Italian" },
  { value: "por", label: "Portuguese" },
]);

export function validateOcrPdf(file) {
  if (!file) return "Choose a PDF to continue.";
  if (!file.size) return "This PDF is empty.";
  if (file.size > OCR_PDF_LIMITS.maxInputBytes) return "Choose a PDF no larger than 20 MB.";
  if (!String(file.name || "").toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") return "Choose a PDF file.";
  return "";
}

export function isSupportedOcrLanguage(language) {
  return OCR_LANGUAGES.some((option) => option.value === language);
}

export function ocrRenderScaleForPage(width, height) {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  return Math.max(1.4, Math.min(
    OCR_PDF_LIMITS.renderScale,
    Math.sqrt(OCR_PDF_LIMITS.maxRenderPixels / (safeWidth * safeHeight)),
  ));
}

function normalizedText(value) {
  return Array.from(String(value || ""))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
    })
    .join("")
    .normalize("NFKC")
    .trim();
}

function collectTesseractWords(data) {
  const nested = [];
  for (const block of data?.blocks || []) {
    for (const paragraph of block.paragraphs || []) {
      for (const line of paragraph.lines || []) nested.push(...(line.words || []));
    }
  }
  return nested.length ? nested : (data?.words || []);
}

export function flattenOcrWords(data) {
  const words = [];
  for (const word of collectTesseractWords(data)) {
    const text = normalizedText(word.text);
    const bbox = word.bbox;
    if (text && bbox && Number.isFinite(bbox.x0) && Number.isFinite(bbox.y0) && Number.isFinite(bbox.x1) && Number.isFinite(bbox.y1)) {
      words.push({ text, confidence: Number(word.confidence || 0), bbox });
    }
  }
  return words;
}

function percentileFromHistogram(histogram, total, percentile) {
  const target = Math.max(0, Math.min(total - 1, Math.round(total * percentile)));
  let seen = 0;
  for (let value = 0; value < histogram.length; value += 1) {
    seen += histogram[value];
    if (seen > target) return value;
  }
  return 255;
}

function otsuThreshold(histogram, total) {
  let sum = 0;
  for (let index = 0; index < 256; index += 1) sum += index * histogram[index];
  let backgroundWeight = 0;
  let backgroundSum = 0;
  let bestVariance = -1;
  let bestThreshold = 180;
  for (let threshold = 0; threshold < 256; threshold += 1) {
    backgroundWeight += histogram[threshold];
    if (!backgroundWeight) continue;
    const foregroundWeight = total - backgroundWeight;
    if (!foregroundWeight) break;
    backgroundSum += threshold * histogram[threshold];
    const backgroundMean = backgroundSum / backgroundWeight;
    const foregroundMean = (sum - backgroundSum) / foregroundWeight;
    const variance = backgroundWeight * foregroundWeight * (backgroundMean - foregroundMean) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      bestThreshold = threshold;
    }
  }
  return bestThreshold;
}

export function enhanceOcrImageData(imageData, mode = "auto") {
  const width = Number(imageData?.width || 0);
  const height = Number(imageData?.height || 0);
  const source = imageData?.data;
  if (!width || !height || !source?.length) throw new Error("A rendered page image is required for OCR cleanup.");
  const output = new Uint8ClampedArray(source);
  if (mode === "original") return { data: output, width, height };

  const pixelCount = width * height;
  const grayscale = new Uint8ClampedArray(pixelCount);
  const histogram = new Uint32Array(256);
  for (let pixel = 0, offset = 0; pixel < pixelCount; pixel += 1, offset += 4) {
    const value = Math.round(output[offset] * 0.2126 + output[offset + 1] * 0.7152 + output[offset + 2] * 0.0722);
    grayscale[pixel] = value;
    histogram[value] += 1;
  }

  const low = percentileFromHistogram(histogram, pixelCount, 0.01);
  const high = percentileFromHistogram(histogram, pixelCount, 0.99);
  const range = Math.max(24, high - low);
  const threshold = mode === "document" ? otsuThreshold(histogram, pixelCount) : null;
  const leveled = new Uint8ClampedArray(pixelCount);
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    let value = Math.round(((grayscale[pixel] - low) / range) * 255);
    value = Math.max(0, Math.min(255, value));
    if (threshold !== null) value = grayscale[pixel] <= threshold ? 0 : 255;
    leveled[pixel] = value;
  }
  if (mode === "auto" && width > 2 && height > 2) {
    const sharpenSource = leveled.slice();
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const pixel = y * width + x;
        const sharpened = sharpenSource[pixel] * 2
          - (sharpenSource[pixel - 1] + sharpenSource[pixel + 1] + sharpenSource[pixel - width] + sharpenSource[pixel + width]) * 0.25;
        leveled[pixel] = Math.max(0, Math.min(255, Math.round(sharpened)));
      }
    }
  }
  for (let pixel = 0, offset = 0; pixel < pixelCount; pixel += 1, offset += 4) {
    const value = leveled[pixel];
    output[offset] = value;
    output[offset + 1] = value;
    output[offset + 2] = value;
    output[offset + 3] = 255;
  }
  return { data: output, width, height };
}

export function summarizeOcrConfidence(pages, lowConfidenceThreshold = 70) {
  const words = (pages || []).flatMap((page) => page.words || []);
  const confidentWords = words.filter((word) => Number.isFinite(Number(word.confidence)));
  const averageConfidence = confidentWords.length
    ? confidentWords.reduce((total, word) => total + Number(word.confidence), 0) / confidentWords.length
    : 0;
  const lowConfidenceWords = confidentWords.filter((word) => Number(word.confidence) < lowConfidenceThreshold).length;
  return {
    wordCount: words.length,
    averageConfidence: Math.round(averageConfidence),
    lowConfidenceWords,
    rating: averageConfidence >= 90 ? "High" : averageConfidence >= 75 ? "Review suggested" : "Needs review",
  };
}

export function ocrTextFromPages(pages) {
  return pages.map((page, index) => `Page ${index + 1}\n${normalizedText(page.text) || page.words.map((word) => word.text).join(" ")}`).join("\n\n");
}

function pdfEncodableText(font, value) {
  const text = normalizedText(value);
  if (!text) return "";
  try {
    font.encodeText(text);
    return text;
  } catch {
    const fallback = text
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, "-")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E]/g, "?");
    try {
      font.encodeText(fallback);
      return fallback;
    } catch {
      return "";
    }
  }
}

export async function createSearchablePdfFromOcrPages(pages, { title = "Searchable document" } = {}) {
  if (!pages?.length) throw new Error("No OCR pages were available for export.");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const source of pages) {
    const pageWidth = Number(source.pageWidth) || 612;
    const pageHeight = Number(source.pageHeight) || pageWidth * source.imageHeight / Math.max(1, source.imageWidth);
    const page = pdf.addPage([pageWidth, pageHeight]);
    const image = await pdf.embedPng(source.imageBytes);
    page.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight });
    for (const word of source.words || []) {
      const text = pdfEncodableText(font, word.text);
      if (!text) continue;
      const x = word.bbox.x0 / source.imageWidth * pageWidth;
      const y = pageHeight - word.bbox.y1 / source.imageHeight * pageHeight;
      const height = Math.max(4, (word.bbox.y1 - word.bbox.y0) / source.imageHeight * pageHeight);
      const size = Math.max(4, Math.min(48, height * 0.82));
      page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0), opacity: 0 });
    }
  }
  pdf.setTitle(pdfEncodableText(font, title));
  pdf.setCreator("PDFArrow");
  pdf.setProducer("PDFArrow browser OCR");
  return pdf.save();
}

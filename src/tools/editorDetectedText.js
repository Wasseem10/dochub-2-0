const DEFAULT_BACKGROUND = "#ffffff";

function byteToHex(value) {
  return Math.max(0, Math.min(255, Math.round(Number(value) || 0))).toString(16).padStart(2, "0");
}

function median(values) {
  if (!values.length) return 255;
  const ordered = values.slice().sort((a, b) => a - b);
  return ordered[Math.floor(ordered.length / 2)];
}

export function resolveDetectedTextStyle(styles = {}, fontName = "") {
  const style = styles?.[fontName] || {};
  const family = String(style.fontFamily || fontName || "Helvetica").trim() || "Helvetica";
  const descriptor = `${family} ${fontName}`.toLowerCase();
  return {
    fontFamily: family,
    bold: /(?:bold|black|heavy|semibold|demi|700|800|900)/.test(descriptor),
    italic: /(?:italic|oblique)/.test(descriptor),
    monospace: /(?:courier|mono|consolas|code)/.test(descriptor),
    serif: /(?:times|georgia|garamond|baskerville|serif)/.test(descriptor)
      && !/(?:sans-serif|sans serif)/.test(descriptor),
  };
}

export function standardPdfFontVariant(fontFamily = "", bold = false, italic = false) {
  const family = String(fontFamily).toLowerCase();
  const group = /(?:courier|mono|consolas)/.test(family)
    ? "courier"
    : /(?:times|georgia|serif)/.test(family) && !/(?:sans-serif|sans serif)/.test(family)
      ? "times"
      : "helvetica";
  if (bold && italic) return `${group}BoldItalic`;
  if (bold) return `${group}Bold`;
  if (italic) return `${group}Italic`;
  return group;
}

export function backgroundColorFromSamples(samples, fallback = DEFAULT_BACKGROUND) {
  const usable = (samples || []).filter((sample) => (
    Array.isArray(sample)
    && sample.length >= 3
    && sample.slice(0, 3).every(Number.isFinite)
  ));
  if (!usable.length) return fallback;
  const red = median(usable.map((sample) => sample[0]));
  const green = median(usable.map((sample) => sample[1]));
  const blue = median(usable.map((sample) => sample[2]));
  return `#${byteToHex(red)}${byteToHex(green)}${byteToHex(blue)}`;
}

export function sampleDetectedTextBackground(context, canvasWidth, canvasHeight, item) {
  if (!context || !canvasWidth || !canvasHeight || !item) return DEFAULT_BACKGROUND;
  const left = item.x * canvasWidth;
  const top = item.y * canvasHeight;
  const right = (item.x + item.w) * canvasWidth;
  const bottom = (item.y + item.h) * canvasHeight;
  const margin = Math.max(2, Math.min(canvasWidth, canvasHeight) * 0.0025);
  const points = [
    [left + margin, top - margin],
    [(left + right) / 2, top - margin],
    [right - margin, top - margin],
    [left - margin, (top + bottom) / 2],
    [right + margin, (top + bottom) / 2],
    [left + margin, bottom + margin],
    [(left + right) / 2, bottom + margin],
    [right - margin, bottom + margin],
  ];
  const samples = [];
  for (const [sampleX, sampleY] of points) {
    const x = Math.max(0, Math.min(canvasWidth - 1, Math.round(sampleX)));
    const y = Math.max(0, Math.min(canvasHeight - 1, Math.round(sampleY)));
    try {
      const pixel = context.getImageData(x, y, 1, 1).data;
      if (pixel?.length >= 3 && (pixel[3] ?? 255) > 0) samples.push([pixel[0], pixel[1], pixel[2]]);
    } catch {
      return DEFAULT_BACKGROUND;
    }
  }
  return backgroundColorFromSamples(samples, DEFAULT_BACKGROUND);
}

export function detectedTextBaseline(item, pageHeight, boxHeight, fontSize) {
  if (Number.isFinite(item?.baselineOffset)) {
    return pageHeight - (Number(item.y || 0) + item.baselineOffset) * pageHeight;
  }
  const bottom = pageHeight - Number(item?.y || 0) * pageHeight - boxHeight;
  return bottom + Math.max(1, boxHeight - fontSize * 0.95);
}

export function detectedTextRotation(transform = []) {
  const [a = 1, b = 0] = transform;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  const raw = Math.atan2(b, a) * 180 / Math.PI;
  const normalized = ((raw + 180) % 360 + 360) % 360 - 180;
  return Math.abs(normalized) < 0.05 ? 0 : normalized;
}

function splitLongToken(token, size, maxWidth, measure) {
  if (!token || measure(token, size) <= maxWidth) return [token];
  const pieces = [];
  let current = "";
  for (const character of token) {
    const candidate = `${current}${character}`;
    if (current && measure(candidate, size) > maxWidth) {
      pieces.push(current);
      current = character;
    } else {
      current = candidate;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

function wrapDetectedParagraph(paragraph, size, maxWidth, measure) {
  if (!paragraph) return [""];
  const words = paragraph.trim().split(/\s+/).flatMap((word) => splitLongToken(word, size, maxWidth, measure));
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (current && measure(candidate, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });
  if (current || !lines.length) lines.push(current);
  return lines;
}

export function layoutDetectedText(text, {
  fontSize = 11,
  minimumFontSize = 4,
  maximumWidth = Infinity,
  maximumHeight = Infinity,
  lineHeightRatio = 1.18,
  measure = (value, size) => String(value || "").length * size * 0.52,
} = {}) {
  const value = String(text ?? "").replace(/\r\n?/g, "\n");
  let size = Math.max(minimumFontSize, Number(fontSize) || 11);
  let lines = [];
  let lineHeight = size * lineHeightRatio;
  while (size >= minimumFontSize) {
    lines = value.split("\n").flatMap((paragraph) => wrapDetectedParagraph(paragraph, size, maximumWidth, measure));
    lineHeight = size * lineHeightRatio;
    const widest = Math.max(0, ...lines.map((line) => measure(line, size)));
    const height = Math.max(lineHeight, lines.length * lineHeight);
    if (widest <= maximumWidth + 0.01 && height <= maximumHeight + 0.01) break;
    if (size === minimumFontSize) break;
    size = Math.max(minimumFontSize, size - 0.5);
  }
  return {
    lines,
    fontSize: size,
    lineHeight,
    overflow: lines.length * lineHeight > maximumHeight + 0.01,
  };
}

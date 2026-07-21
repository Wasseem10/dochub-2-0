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

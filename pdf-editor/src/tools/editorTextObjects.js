function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeEditorText(value) {
  return String(value ?? "").replace(/\r\n?/g, "\n");
}

export function estimateTextAnnotationSize({
  content = "",
  fontSize = 16,
  lineHeight = 1.25,
  pageWidth = 760,
  pageHeight = 984,
} = {}) {
  const normalizedContent = normalizeEditorText(content);
  const lines = normalizedContent.split("\n");
  const longestLine = Math.max(1, ...lines.map((line) => line.length));
  const safeFontSize = clamp(Number(fontSize) || 16, 8, 96);
  const safeLineHeight = clamp(Number(lineHeight) || 1.25, 1, 2.5);
  const estimatedTextWidth = longestLine * safeFontSize * 0.61 + 24;
  const estimatedTextHeight = Math.max(38, lines.length * safeFontSize * safeLineHeight + 14);

  return {
    w: clamp(estimatedTextWidth / Math.max(1, pageWidth), 0.16, 0.78),
    h: clamp(estimatedTextHeight / Math.max(1, pageHeight), 0.05, 0.42),
  };
}

export function createTextAnnotation({ id, page, point, content = "", settings, createdAt }) {
  const normalizedContent = normalizeEditorText(content).trimEnd();
  const { w: width, h: height } = estimateTextAnnotationSize({
    content: normalizedContent,
    fontSize: settings.textSize,
    lineHeight: settings.lineHeight,
  });

  return {
    id,
    type: "text",
    page,
    x: clamp(point.x, 0.02, 0.96 - width),
    y: clamp(point.y, 0.02, 0.97 - height),
    w: width,
    h: height,
    content: normalizedContent,
    color: settings.textColor,
    fontSize: settings.textSize,
    fontFamily: settings.fontFamily,
    textAlign: settings.textAlign,
    lineHeight: settings.lineHeight,
    bold: settings.textBold,
    italic: settings.textItalic,
    underline: settings.textUnderline,
    opacity: 1,
    createdAt,
    updatedAt: createdAt,
  };
}

export function shouldDiscardTextAnnotation(content) {
  return normalizeEditorText(content).trim().length === 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export const EDITOR_TEXT_MIN_WIDTH = 0.085;
export const EDITOR_TEXT_MIN_HEIGHT = 0.028;

export function normalizeEditorText(value) {
  return String(value ?? "").replace(/\r\n?/g, "\n");
}

/** Word wrapping shared by frame measurement and PDF export; never scales fonts. */
export function wrapEditorText(content, maxWidth, measureLine) {
  const result = [];
  for (const paragraph of normalizeEditorText(content).split("\n")) {
    let line = "";
    for (const token of paragraph.match(/\S+\s*|\s+/g) || []) {
      if (line && measureLine(line + token.trimEnd()) > maxWidth) {
        result.push(line.trimEnd());
        line = "";
      }
      for (const character of token) {
        if (line && !/\s/.test(character) && measureLine(line + character) > maxWidth) {
          result.push(line.trimEnd());
          line = "";
        }
        line += character;
      }
    }
    result.push(line.trimEnd());
  }
  return result;
}

export function estimateTextAnnotationSize({
  content = "",
  fontSize = 16,
  lineHeight = 1.25,
  pageWidth = 760,
  pageHeight = 984,
  minWidth = EDITOR_TEXT_MIN_WIDTH,
  maxWidth = 0.78,
  minHeight = EDITOR_TEXT_MIN_HEIGHT,
  maxHeight = 0.42,
  measureLine,
} = {}) {
  const normalizedContent = normalizeEditorText(content);
  const lines = normalizedContent.split("\n");
  const safeFontSize = clamp(Number(fontSize) || 16, 8, 96);
  const safeLineHeight = clamp(Number(lineHeight) || 1.25, 1, 2.5);
  const safePageWidth = Math.max(1, Number(pageWidth) || 760);
  const safePageHeight = Math.max(1, Number(pageHeight) || 984);
  const safeMinWidth = clamp(Number(minWidth) || EDITOR_TEXT_MIN_WIDTH, 0.04, 0.95);
  const safeMaxWidth = clamp(Number(maxWidth) || 0.78, safeMinWidth, 0.98);
  const safeMinHeight = clamp(Number(minHeight) || EDITOR_TEXT_MIN_HEIGHT, 0.02, 0.95);
  const safeMaxHeight = clamp(Number(maxHeight) || 0.42, safeMinHeight, 0.98);
  const lineWidths = lines.map((line) => {
    if (typeof measureLine === "function") return Math.max(0, Number(measureLine(line)) || 0);
    return Math.max(1, line.length) * safeFontSize * 0.61;
  });
  const horizontalPadding = Math.max(6, safeFontSize * 0.35);
  const verticalPadding = Math.max(4, safeFontSize * 0.18);
  const naturalWidth = Math.max(0, ...lineWidths) + horizontalPadding;
  const width = clamp(naturalWidth / safePageWidth, safeMinWidth, safeMaxWidth);
  const usableLineWidth = Math.max(safeFontSize, width * safePageWidth - horizontalPadding);
  const measure = typeof measureLine === "function" ? measureLine : (line) => line.length * safeFontSize * 0.61;
  const visualLineCount = wrapEditorText(normalizedContent, usableLineWidth + 0.5, measure).length;
  const naturalHeight = visualLineCount * safeFontSize * safeLineHeight + verticalPadding;

  return {
    w: width,
    h: clamp(naturalHeight / safePageHeight, safeMinHeight, safeMaxHeight),
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

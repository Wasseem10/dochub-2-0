function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeEditorText(value) {
  return String(value ?? "").replace(/\r\n?/g, "\n");
}

export function createTextAnnotation({ id, page, point, content = "", settings, createdAt }) {
  const normalizedContent = normalizeEditorText(content).trimEnd();
  const isBlankInsertion = normalizedContent.length === 0;
  const lines = normalizedContent.split("\n");
  const longestLine = Math.max(...lines.map((line) => line.length), isBlankInsertion ? 1 : 9);
  const width = isBlankInsertion ? 0.11 : clamp(longestLine * 0.0085, 0.075, 0.42);
  const height = isBlankInsertion ? 0.038 : clamp(lines.length * 0.024 + 0.02, 0.038, 0.28);

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

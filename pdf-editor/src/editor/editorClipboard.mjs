export const EDITOR_CLIPBOARD_MIME = "application/x-fixthatpdf-object";

const clampUnit = (value, maximum = 1) => Math.round(Math.max(0, Math.min(maximum, value)) * 1_000_000) / 1_000_000;

export function createEditorClipboardPayload({ annotation, detectedText }) {
  if (annotation) {
    return {
      version: 1,
      kind: "annotation",
      object: {
        ...annotation,
        points: Array.isArray(annotation.points) ? annotation.points.map((point) => ({ ...point })) : annotation.points,
      },
    };
  }
  if (!detectedText) return null;
  return {
    version: 1,
    kind: "annotation",
    object: {
      type: "text",
      page: detectedText.pageNumber,
      x: detectedText.x,
      y: detectedText.y,
      w: detectedText.w,
      h: detectedText.h,
      content: detectedText.currentText || " ",
      color: detectedText.color || "#111827",
      fontSize: detectedText.fontSize || 14,
      fontFamily: detectedText.fontFamily || "Inter",
      textAlign: detectedText.textAlign || "left",
      lineHeight: detectedText.lineHeight || 1.2,
      bold: Boolean(detectedText.bold),
      italic: Boolean(detectedText.italic),
      underline: Boolean(detectedText.underline),
      opacity: detectedText.opacity ?? 1,
    },
  };
}

export function parseEditorClipboardPayload(serialized) {
  if (!serialized) return null;
  try {
    const payload = typeof serialized === "string" ? JSON.parse(serialized) : serialized;
    if (payload?.version !== 1 || payload.kind !== "annotation" || !payload.object || typeof payload.object !== "object") return null;
    return payload;
  } catch {
    return null;
  }
}

export function createPastedEditorObject(payload, { id, pageIndex, pasteCount = 1 }) {
  const parsed = parseEditorClipboardPayload(payload);
  if (!parsed || !id || !Number.isInteger(pageIndex)) return null;
  const source = parsed.object;
  const offset = 0.025 * Math.max(1, pasteCount);
  if (source.type === "draw" && Array.isArray(source.points)) {
    return {
      ...source,
      id,
      page: pageIndex,
      points: source.points.map((point) => ({ x: clampUnit(point.x + offset), y: clampUnit(point.y + offset) })),
    };
  }
  const width = Number.isFinite(source.w) ? source.w : 0.16;
  const height = Number.isFinite(source.h) ? source.h : 0.06;
  return {
    ...source,
    id,
    page: pageIndex,
    x: clampUnit((source.x || 0) + offset, Math.max(0, 1 - width)),
    y: clampUnit((source.y || 0) + offset, Math.max(0, 1 - height)),
  };
}

export function editorClipboardPlainText(payload) {
  const parsed = parseEditorClipboardPayload(payload);
  if (!parsed) return "";
  return String(parsed.object.content || "");
}

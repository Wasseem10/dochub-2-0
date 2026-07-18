export const EDITOR_MODE_TOOLS = Object.freeze({
  view: ["select"],
  annotate: ["highlight", "draw", "erase", "comment"],
  shapes: ["rectangle", "circle", "line", "arrow"],
  insert: ["text", "image"],
  edit: ["editText", "text"],
  fill: ["field", "checkbox", "date", "signature", "initials"],
});

export function activateEditorMode(mode, currentTool = "select") {
  const tools = EDITOR_MODE_TOOLS[mode] || EDITOR_MODE_TOOLS.view;
  return tools.includes(currentTool) ? currentTool : tools[0];
}

export function moveEditorObject(object, delta) {
  const width = object.w || 0;
  const height = object.h || 0;
  return {
    ...object,
    x: Math.max(0, Math.min(1 - width, object.x + delta.x)),
    y: Math.max(0, Math.min(1 - height, object.y + delta.y)),
  };
}

export function resizeEditorObject(object, size) {
  return {
    ...object,
    w: Math.max(0.03, Math.min(1 - object.x, size.w)),
    h: Math.max(0.018, Math.min(1 - object.y, size.h)),
  };
}

export function resizeEditorObjectFromHandle(object, handle, delta, { minWidth = 0.03, minHeight = 0.018 } = {}) {
  const normalized = (value) => Math.round(value * 1_000_000) / 1_000_000;
  const rotation = ((object.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const localDx = (delta.x || 0) * cos + (delta.y || 0) * sin;
  const localDy = -(delta.x || 0) * sin + (delta.y || 0) * cos;
  let left = object.x;
  let top = object.y;
  let right = object.x + object.w;
  let bottom = object.y + object.h;

  if (handle.includes("w")) left = Math.max(0, Math.min(right - minWidth, left + localDx));
  if (handle.includes("e")) right = Math.min(1, Math.max(left + minWidth, right + localDx));
  if (handle.includes("n")) top = Math.max(0, Math.min(bottom - minHeight, top + localDy));
  if (handle.includes("s")) bottom = Math.min(1, Math.max(top + minHeight, bottom + localDy));

  return {
    ...object,
    x: normalized(left),
    y: normalized(top),
    w: normalized(right - left),
    h: normalized(bottom - top),
  };
}

export function rotateEditorObject(object, deltaDegrees) {
  const rotation = ((object.rotation || 0) + deltaDegrees) % 360;
  return { ...object, rotation: rotation < 0 ? rotation + 360 : rotation };
}

export function rotateEditorObjectWithPage(object) {
  const normalized = (value) => Math.round(value * 1_000_000) / 1_000_000;
  if (Array.isArray(object.points)) {
    return { ...object, points: object.points.map((point) => ({ x: normalized(1 - point.y), y: normalized(point.x) })) };
  }
  if (![object.x, object.y, object.w, object.h].every(Number.isFinite)) return object;
  return {
    ...object,
    x: normalized(1 - object.y - object.h),
    y: normalized(object.x),
    w: normalized(object.h),
    h: normalized(object.w),
    rotation: ((object.rotation || 0) + 90) % 360,
  };
}

export function unrotateEditorObjectFromPage(object, pageRotation = 0) {
  let result = object;
  const normalized = (value) => Math.round(value * 1_000_000) / 1_000_000;
  const turns = (((Math.round(pageRotation / 90) % 4) + 4) % 4);
  for (let turn = 0; turn < turns; turn += 1) {
    if (Array.isArray(result.points)) {
      result = { ...result, points: result.points.map((point) => ({ x: normalized(point.y), y: normalized(1 - point.x) })) };
      continue;
    }
    if (![result.x, result.y, result.w, result.h].every(Number.isFinite)) continue;
    result = {
      ...result,
      x: normalized(result.y),
      y: normalized(1 - result.x - result.w),
      w: normalized(result.h),
      h: normalized(result.w),
      rotation: (((result.rotation || 0) - 90) % 360 + 360) % 360,
    };
  }
  return result;
}

export function createEditorHistory(initialDocument) {
  return { present: initialDocument, undo: [], redo: [] };
}

export function commitEditorHistory(history, nextDocument) {
  return { present: nextDocument, undo: [...history.undo, history.present].slice(-25), redo: [] };
}

export function undoEditorHistory(history) {
  if (!history.undo.length) return history;
  return {
    present: history.undo.at(-1),
    undo: history.undo.slice(0, -1),
    redo: [history.present, ...history.redo].slice(0, 25),
  };
}

export function redoEditorHistory(history) {
  if (!history.redo.length) return history;
  return {
    present: history.redo[0],
    undo: [...history.undo, history.present].slice(-25),
    redo: history.redo.slice(1),
  };
}

export function visibleThumbnailRange({ scrollTop, viewportHeight, itemHeight = 116, pageCount, overscan = 2 }) {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const end = Math.min(pageCount, Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan);
  return { start, end, count: Math.max(0, end - start) };
}

export function thumbnailScrollTarget({ selectedIndex, scrollTop, viewportHeight, itemHeight = 130, pageCount }) {
  if (!pageCount || selectedIndex < 0 || selectedIndex >= pageCount) return null;
  const itemTop = selectedIndex * itemHeight;
  const itemBottom = itemTop + itemHeight;
  if (itemTop < scrollTop) return itemTop;
  if (itemBottom > scrollTop + viewportHeight) return Math.max(0, itemBottom - viewportHeight);
  return null;
}

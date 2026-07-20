function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeRedactionRect(start, end) {
  const left = clamp(Math.min(start.x, end.x));
  const top = clamp(Math.min(start.y, end.y));
  const right = clamp(Math.max(start.x, end.x));
  const bottom = clamp(Math.max(start.y, end.y));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function isUsableRedaction(rect) {
  return Boolean(rect && rect.width >= 0.005 && rect.height >= 0.005);
}

export function redactionsForPage(redactions, pageIndex) {
  return redactions.filter((redaction) => redaction.pageIndex === pageIndex && isUsableRedaction(redaction));
}

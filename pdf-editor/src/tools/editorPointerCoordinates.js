function clampUnit(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function normalizedPointerInRect(pointer, rect) {
  const width = Number(rect?.width || 0);
  const height = Number(rect?.height || 0);
  if (width <= 0 || height <= 0) return { x: 0, y: 0 };

  return {
    x: clampUnit((Number(pointer?.clientX || 0) - Number(rect.left || 0)) / width),
    y: clampUnit((Number(pointer?.clientY || 0) - Number(rect.top || 0)) / height),
  };
}

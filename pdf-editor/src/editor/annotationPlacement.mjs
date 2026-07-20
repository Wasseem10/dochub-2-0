function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function pointerToNormalizedPoint(point, rect) {
  return {
    x: clamp((point.clientX - rect.left) / rect.width, 0, 1),
    y: clamp((point.clientY - rect.top) / rect.height, 0, 1),
  };
}

export function centeredAnnotationBounds(point, width, height) {
  return {
    x: clamp(point.x - width / 2, 0, 1 - width),
    y: clamp(point.y - height / 2, 0, 1 - height),
    w: width,
    h: height,
  };
}

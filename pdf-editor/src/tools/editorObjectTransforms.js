const FRAME_TYPES = new Set([
  "text", "highlight", "whiteout", "checkbox", "rectangle", "circle", "line", "arrow",
  "comment", "signature", "initials", "image", "field",
]);

export function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

export function normalizeRotation(value) {
  const normalized = Number(value || 0) % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function getAnnotationFrame(annotation) {
  if (FRAME_TYPES.has(annotation?.type)) {
    return {
      x: Number(annotation.x || 0),
      y: Number(annotation.y || 0),
      w: Math.max(0.001, Number(annotation.w || 0.001)),
      h: Math.max(0.001, Number(annotation.h || 0.001)),
      rotation: normalizeRotation(annotation.rotation),
    };
  }

  if (annotation?.type === "draw" && annotation.points?.length) {
    const xs = annotation.points.map((point) => Number(point.x || 0));
    const ys = annotation.points.map((point) => Number(point.y || 0));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const padding = 0.006;
    return {
      x: clampNumber(minX - padding, 0, 1),
      y: clampNumber(minY - padding, 0, 1),
      w: Math.max(0.018, maxX - minX + padding * 2),
      h: Math.max(0.018, maxY - minY + padding * 2),
      rotation: normalizeRotation(annotation.rotation),
    };
  }

  return { x: 0, y: 0, w: 0.1, h: 0.05, rotation: 0 };
}

export function moveFrame(frame, deltaX, deltaY) {
  return {
    ...frame,
    x: clampNumber(frame.x + deltaX, 0, Math.max(0, 1 - frame.w)),
    y: clampNumber(frame.y + deltaY, 0, Math.max(0, 1 - frame.h)),
  };
}

export function resizeFrame(frame, handle, deltaX, deltaY, options = {}) {
  const minWidth = options.minWidth ?? 0.025;
  const minHeight = options.minHeight ?? 0.018;
  let left = frame.x;
  let top = frame.y;
  let right = frame.x + frame.w;
  let bottom = frame.y + frame.h;

  if (handle.includes("w")) left = clampNumber(left + deltaX, 0, right - minWidth);
  if (handle.includes("e")) right = clampNumber(right + deltaX, left + minWidth, 1);
  if (handle.includes("n")) top = clampNumber(top + deltaY, 0, bottom - minHeight);
  if (handle.includes("s")) bottom = clampNumber(bottom + deltaY, top + minHeight, 1);

  return {
    ...frame,
    x: left,
    y: top,
    w: right - left,
    h: bottom - top,
  };
}

export function rotationFromPointer(frame, pageRect, clientX, clientY, offset = 0) {
  const centerX = pageRect.left + (frame.x + frame.w / 2) * pageRect.width;
  const centerY = pageRect.top + (frame.y + frame.h / 2) * pageRect.height;
  const degrees = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI) + 90;
  return normalizeRotation(degrees + offset);
}

export function annotationPatchFromFrame(annotation, nextFrame, previousFrame = getAnnotationFrame(annotation)) {
  if (annotation?.type !== "draw") {
    return {
      x: nextFrame.x,
      y: nextFrame.y,
      w: nextFrame.w,
      h: nextFrame.h,
      rotation: normalizeRotation(nextFrame.rotation),
    };
  }

  const previousWidth = Math.max(previousFrame.w, 0.0001);
  const previousHeight = Math.max(previousFrame.h, 0.0001);
  return {
    points: (annotation.points || []).map((point) => ({
      x: nextFrame.x + ((point.x - previousFrame.x) / previousWidth) * nextFrame.w,
      y: nextFrame.y + ((point.y - previousFrame.y) / previousHeight) * nextFrame.h,
    })),
    rotation: normalizeRotation(nextFrame.rotation),
  };
}

export function framesEqual(left, right, epsilon = 0.00001) {
  return ["x", "y", "w", "h", "rotation"].every((key) => Math.abs(Number(left[key] || 0) - Number(right[key] || 0)) <= epsilon);
}

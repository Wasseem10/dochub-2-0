const DEFAULT_PAGE_WIDTH = 760;
const DEFAULT_PAGE_HEIGHT = 984;

function pageSize(pageWidth, pageHeight) {
  return {
    width: Math.max(1, Number(pageWidth) || DEFAULT_PAGE_WIDTH),
    height: Math.max(1, Number(pageHeight) || DEFAULT_PAGE_HEIGHT),
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function point(value = {}) {
  return {
    x: clamp(Number(value.x), 0, 1),
    y: clamp(Number(value.y), 0, 1),
  };
}

export function circleFrameFromDrag(startValue, endValue, pageWidth, pageHeight, minimumDiameter = 0) {
  const start = point(startValue);
  const end = point(endValue);
  const page = pageSize(pageWidth, pageHeight);
  const directionX = end.x >= start.x ? 1 : -1;
  const directionY = end.y >= start.y ? 1 : -1;
  const requestedDiameter = Math.max(
    Math.abs(end.x - start.x) * page.width,
    Math.abs(end.y - start.y) * page.height,
    Math.max(0, Number(minimumDiameter) || 0),
  );
  const horizontalRoom = directionX > 0 ? (1 - start.x) * page.width : start.x * page.width;
  const verticalRoom = directionY > 0 ? (1 - start.y) * page.height : start.y * page.height;
  const diameter = Math.min(requestedDiameter, horizontalRoom, verticalRoom, page.width, page.height);
  const w = diameter / page.width;
  const h = diameter / page.height;

  return {
    x: directionX > 0 ? start.x : start.x - w,
    y: directionY > 0 ? start.y : start.y - h,
    w,
    h,
  };
}

export function normalizeCircleFrame(frame, pageWidth, pageHeight) {
  const page = pageSize(pageWidth, pageHeight);
  const diameter = Math.min(
    Math.max(Number(frame?.w || 0) * page.width, Number(frame?.h || 0) * page.height, 1),
    page.width,
    page.height,
  );
  const w = diameter / page.width;
  const h = diameter / page.height;
  return {
    ...frame,
    x: clamp(Number(frame?.x || 0), 0, 1 - w),
    y: clamp(Number(frame?.y || 0), 0, 1 - h),
    w,
    h,
  };
}

export function resizeCircleFrame(frame, handle, deltaX, deltaY, pageWidth, pageHeight, minimumDiameter = 18) {
  const page = pageSize(pageWidth, pageHeight);
  const left = Number(frame.x || 0) * page.width;
  const top = Number(frame.y || 0) * page.height;
  const diameter = Math.max(Number(frame.w || 0) * page.width, Number(frame.h || 0) * page.height, 1);
  const right = left + diameter;
  const bottom = top + diameter;
  const centerX = left + diameter / 2;
  const centerY = top + diameter / 2;
  const dx = Number(deltaX || 0) * page.width;
  const dy = Number(deltaY || 0) * page.height;
  const hasWest = handle.includes("w");
  const hasEast = handle.includes("e");
  const hasNorth = handle.includes("n");
  const hasSouth = handle.includes("s");

  const anchorX = hasWest ? right : hasEast ? left : centerX;
  const anchorY = hasNorth ? bottom : hasSouth ? top : centerY;
  const horizontalCandidate = hasWest
    ? Math.abs((left + dx) - anchorX)
    : hasEast
      ? Math.abs((right + dx) - anchorX)
      : diameter;
  const verticalCandidate = hasNorth
    ? Math.abs((top + dy) - anchorY)
    : hasSouth
      ? Math.abs((bottom + dy) - anchorY)
      : diameter;
  const candidate = (hasWest || hasEast) && (hasNorth || hasSouth)
    ? Math.max(horizontalCandidate, verticalCandidate)
    : hasWest || hasEast
      ? horizontalCandidate
      : verticalCandidate;

  const horizontalRoom = hasWest ? anchorX : hasEast ? page.width - anchorX : Math.min(anchorX, page.width - anchorX) * 2;
  const verticalRoom = hasNorth ? anchorY : hasSouth ? page.height - anchorY : Math.min(anchorY, page.height - anchorY) * 2;
  const maxDiameter = Math.max(1, Math.min(horizontalRoom, verticalRoom, page.width, page.height));
  const nextDiameter = clamp(candidate, Math.min(minimumDiameter, maxDiameter), maxDiameter);
  const nextLeft = hasWest ? anchorX - nextDiameter : hasEast ? anchorX : anchorX - nextDiameter / 2;
  const nextTop = hasNorth ? anchorY - nextDiameter : hasSouth ? anchorY : anchorY - nextDiameter / 2;

  return {
    ...frame,
    x: nextLeft / page.width,
    y: nextTop / page.height,
    w: nextDiameter / page.width,
    h: nextDiameter / page.height,
  };
}

export function directedLineFrameFromPoints(startValue, endValue, pageWidth, pageHeight, padding = 6) {
  const start = point(startValue);
  const end = point(endValue);
  const page = pageSize(pageWidth, pageHeight);
  const padX = Math.max(0, Number(padding) || 0) / page.width;
  const padY = Math.max(0, Number(padding) || 0) / page.height;
  const left = Math.max(0, Math.min(start.x, end.x) - padX);
  const top = Math.max(0, Math.min(start.y, end.y) - padY);
  const right = Math.min(1, Math.max(start.x, end.x) + padX);
  const bottom = Math.min(1, Math.max(start.y, end.y) + padY);

  return {
    x: left,
    y: top,
    w: Math.max(1 / page.width, right - left),
    h: Math.max(1 / page.height, bottom - top),
    startX: start.x,
    startY: start.y,
    endX: end.x,
    endY: end.y,
  };
}

export function ensureDirectedLineLength(startValue, endValue, pageWidth, pageHeight, minimumLength = 44) {
  const start = point(startValue);
  const end = point(endValue);
  const page = pageSize(pageWidth, pageHeight);
  const dx = (end.x - start.x) * page.width;
  const dy = (end.y - start.y) * page.height;
  if (Math.hypot(dx, dy) >= minimumLength) return { start, end };

  const direction = start.x + minimumLength / page.width <= 1 ? 1 : -1;
  return {
    start,
    end: { x: clamp(start.x + direction * minimumLength / page.width, 0, 1), y: start.y },
  };
}

export function getDirectedLineEndpoints(annotation, frame = annotation) {
  const hasStoredEndpoints = [annotation?.startX, annotation?.startY, annotation?.endX, annotation?.endY]
    .every((value) => Number.isFinite(Number(value)));
  if (hasStoredEndpoints) {
    return {
      start: point({ x: Number(annotation.startX), y: Number(annotation.startY) }),
      end: point({ x: Number(annotation.endX), y: Number(annotation.endY) }),
    };
  }

  return {
    start: point({ x: Number(frame?.x || 0), y: Number(frame?.y || 0) }),
    end: point({ x: Number(frame?.x || 0) + Number(frame?.w || 0), y: Number(frame?.y || 0) + Number(frame?.h || 0) }),
  };
}

export function directedLineSvgGeometry(annotation, frame, pageWidth, pageHeight) {
  const page = pageSize(pageWidth, pageHeight);
  const endpoints = getDirectedLineEndpoints(annotation, frame);
  const frameWidth = Math.max(Number(frame?.w || 0), 1 / page.width);
  const frameHeight = Math.max(Number(frame?.h || 0), 1 / page.height);
  const local = (value) => ({
    x: ((value.x - Number(frame?.x || 0)) / frameWidth) * 100,
    y: ((value.y - Number(frame?.y || 0)) / frameHeight) * 100,
  });
  const start = local(endpoints.start);
  const end = local(endpoints.end);
  const dx = (endpoints.end.x - endpoints.start.x) * page.width;
  const dy = (endpoints.end.y - endpoints.start.y) * page.height;
  const length = Math.max(0.001, Math.hypot(dx, dy));
  const unitX = dx / length;
  const unitY = dy / length;
  const strokeWidth = Math.max(1, Number(annotation?.strokeWidth || 3));
  const headLength = Math.min(Math.max(11, strokeWidth * 4.2), length * 0.42);
  const halfHeadWidth = headLength * 0.58;
  const base = {
    x: endpoints.end.x - (unitX * headLength) / page.width,
    y: endpoints.end.y - (unitY * headLength) / page.height,
  };
  const wingOne = local({
    x: base.x + (-unitY * halfHeadWidth) / page.width,
    y: base.y + (unitX * halfHeadWidth) / page.height,
  });
  const wingTwo = local({
    x: base.x - (-unitY * halfHeadWidth) / page.width,
    y: base.y - (unitX * halfHeadWidth) / page.height,
  });

  return {
    start,
    end,
    arrowPoints: `${wingOne.x},${wingOne.y} ${end.x},${end.y} ${wingTwo.x},${wingTwo.y}`,
  };
}

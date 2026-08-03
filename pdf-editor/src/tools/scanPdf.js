export const SCAN_PDF_LIMITS = Object.freeze({
  maxImages: 30,
  maxImageBytes: 20 * 1024 * 1024,
});

export function validateScanFiles(files) {
  const list = Array.from(files || []);
  if (!list.length) return "Choose at least one JPG or PNG image.";
  if (list.length > SCAN_PDF_LIMITS.maxImages) return `Choose no more than ${SCAN_PDF_LIMITS.maxImages} images at once.`;
  for (const file of list) {
    if (!/^image\/(jpeg|png)$/.test(file.type) && !/\.(jpe?g|png)$/i.test(file.name || "")) return "Only JPG and PNG page images are supported.";
    if (!file.size) return `${file.name || "An image"} is empty.`;
    if (file.size > SCAN_PDF_LIMITS.maxImageBytes) return `${file.name || "An image"} is larger than 20 MB.`;
  }
  return "";
}

export function moveScanPage(pages, from, to) {
  if (!Array.isArray(pages) || from === to || from < 0 || to < 0 || from >= pages.length || to >= pages.length) return pages;
  const next = [...pages];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function nextScanRotation(rotation = 0) {
  return (Number(rotation) + 90) % 360;
}

function pixelLuminance(data, offset) {
  return data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
}

function analyzeDocumentMask(imageData, options = {}) {
  const width = Math.trunc(Number(imageData?.width || 0));
  const height = Math.trunc(Number(imageData?.height || 0));
  const data = imageData?.data;
  if (!width || !height || !data?.length) throw new Error("Image pixels are required for automatic scan cropping.");
  if (width < 40 || height < 40) return null;

  const step = Math.max(1, Math.ceil(Math.max(width, height) / 600));
  const cornerWidth = Math.max(step, Math.round(width * 0.06));
  const cornerHeight = Math.max(step, Math.round(height * 0.06));
  const cornerSamples = [];
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const inCorner = (x < cornerWidth || x >= width - cornerWidth) && (y < cornerHeight || y >= height - cornerHeight);
      if (inCorner) cornerSamples.push(pixelLuminance(data, (y * width + x) * 4));
    }
  }
  if (!cornerSamples.length) return null;
  const background = cornerSamples.reduce((total, value) => total + value, 0) / cornerSamples.length;
  const deviation = Math.sqrt(cornerSamples.reduce((total, value) => total + (value - background) ** 2, 0) / cornerSamples.length);
  if (deviation > Number(options.maxBackgroundDeviation || 52)) return null;

  const differenceThreshold = Math.max(Number(options.differenceThreshold || 26), deviation * 2.1);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let foregroundSamples = 0;
  let topLeft = null;
  let topRight = null;
  let bottomRight = null;
  let bottomLeft = null;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const luminance = pixelLuminance(data, (y * width + x) * 4);
      if (Math.abs(luminance - background) < differenceThreshold) continue;
      foregroundSamples += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      if (!topLeft || x + y < topLeft.score) topLeft = { x, y, score: x + y };
      if (!topRight || x - y > topRight.score) topRight = { x, y, score: x - y };
      if (!bottomRight || x + y > bottomRight.score) bottomRight = { x, y, score: x + y };
      if (!bottomLeft || x - y < bottomLeft.score) bottomLeft = { x, y, score: x - y };
    }
  }
  if (!foregroundSamples || maxX <= minX || maxY <= minY) return null;

  const sampleColumns = Math.max(1, Math.floor((maxX - minX) / step) + 1);
  const sampleRows = Math.max(1, Math.floor((maxY - minY) / step) + 1);
  const coverage = foregroundSamples / (sampleColumns * sampleRows);
  const rawWidth = maxX - minX + step;
  const rawHeight = maxY - minY + step;
  if (coverage < Number(options.minCoverage || 0.42) || rawWidth / width < 0.55 || rawHeight / height < 0.55) return null;
  return { width, height, step, minX, minY, maxX, maxY, rawWidth, rawHeight, coverage, topLeft, topRight, bottomRight, bottomLeft };
}

function pointDistance(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function quadrilateralArea(points) {
  return Math.abs(points.reduce((total, point, index) => {
    const next = points[(index + 1) % points.length];
    return total + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
}

function expandCorner(point, center, factor, width, height) {
  return {
    x: Math.max(0, Math.min(width - 1, Math.round(center.x + (point.x - center.x) * factor))),
    y: Math.max(0, Math.min(height - 1, Math.round(center.y + (point.y - center.y) * factor))),
  };
}

export function detectDocumentCorners(imageData, options = {}) {
  const analysis = analyzeDocumentMask(imageData, options);
  if (!analysis) return null;
  const points = [analysis.topLeft, analysis.topRight, analysis.bottomRight, analysis.bottomLeft].map(({ x, y }) => ({ x, y }));
  const areaRatio = quadrilateralArea(points) / (analysis.width * analysis.height);
  const topWidth = pointDistance(points[0], points[1]);
  const bottomWidth = pointDistance(points[3], points[2]);
  const leftHeight = pointDistance(points[0], points[3]);
  const rightHeight = pointDistance(points[1], points[2]);
  if (areaRatio < 0.28 || Math.min(topWidth, bottomWidth) < analysis.width * 0.42 || Math.min(leftHeight, rightHeight) < analysis.height * 0.42) return null;
  const center = points.reduce((result, point) => ({ x: result.x + point.x / 4, y: result.y + point.y / 4 }), { x: 0, y: 0 });
  const [topLeft, topRight, bottomRight, bottomLeft] = points.map((point) => expandCorner(point, center, 1.018, analysis.width, analysis.height));
  return {
    topLeft,
    topRight,
    bottomRight,
    bottomLeft,
    confidence: Math.round(Math.min(1, analysis.coverage * Math.min(1, areaRatio / 0.55)) * 100),
  };
}

export function detectDocumentBounds(imageData, options = {}) {
  const analysis = analyzeDocumentMask(imageData, options);
  if (!analysis) return null;

  const paddingX = Math.max(2, Math.round(analysis.rawWidth * 0.025));
  const paddingY = Math.max(2, Math.round(analysis.rawHeight * 0.025));
  const x = Math.max(0, analysis.minX - paddingX);
  const y = Math.max(0, analysis.minY - paddingY);
  const right = Math.min(analysis.width, analysis.maxX + analysis.step + paddingX);
  const bottom = Math.min(analysis.height, analysis.maxY + analysis.step + paddingY);
  const cropWidth = right - x;
  const cropHeight = bottom - y;
  if (cropWidth * cropHeight > analysis.width * analysis.height * 0.96) return null;
  return { x, y, width: cropWidth, height: cropHeight, confidence: Math.round(analysis.coverage * 100) };
}

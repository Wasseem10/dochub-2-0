let openCvPromise;

const FILTERS = new Set(["original", "enhanced", "grayscale", "black-white"]);

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function orderDocumentCorners(points) {
  if (!Array.isArray(points) || points.length !== 4) throw new Error("Four document corners are required.");
  const sorted = points.map((point) => ({ x: Number(point.x), y: Number(point.y) }));
  const bySum = [...sorted].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  const byDifference = [...sorted].sort((a, b) => (a.x - a.y) - (b.x - b.y));
  return [bySum[0], byDifference[3], bySum[3], byDifference[0]];
}

export function defaultDocumentCorners(width, height, insetRatio = 0.055) {
  const insetX = Math.max(2, width * insetRatio);
  const insetY = Math.max(2, height * insetRatio);
  return [
    { x: insetX, y: insetY },
    { x: width - insetX, y: insetY },
    { x: width - insetX, y: height - insetY },
    { x: insetX, y: height - insetY },
  ];
}

export function getPerspectiveDimensions(corners, maxDimension = 4096) {
  const [topLeft, topRight, bottomRight, bottomLeft] = orderDocumentCorners(corners);
  let width = Math.max(distance(topLeft, topRight), distance(bottomLeft, bottomRight));
  let height = Math.max(distance(topLeft, bottomLeft), distance(topRight, bottomRight));
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  width = Math.max(64, Math.round(width * scale));
  height = Math.max(64, Math.round(height * scale));
  return { width, height };
}

export function getCornerDrift(previous, current, frameWidth, frameHeight) {
  if (!previous || !current || previous.length !== 4 || current.length !== 4) return Number.POSITIVE_INFINITY;
  const diagonal = Math.max(1, Math.hypot(frameWidth, frameHeight));
  return previous.reduce((total, point, index) => total + distance(point, current[index]), 0) / 4 / diagonal;
}

export function autoPageSizeForAspect(width, height) {
  const portraitRatio = Math.min(width, height) / Math.max(width, height);
  const a4Ratio = 210 / 297;
  const letterRatio = 8.5 / 11;
  return Math.abs(portraitRatio - a4Ratio) <= Math.abs(portraitRatio - letterRatio) ? "a4" : "letter";
}

export async function loadDocumentVision() {
  if (!openCvPromise) {
    openCvPromise = import("@techstark/opencv-js").then(async (module) => {
      const imported = module.default || module;
      const cv = imported && typeof imported.then === "function" ? await imported : imported;
      if (cv?.Mat) return cv;
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("The scanner engine took too long to initialize.")), 30000);
        const previous = cv?.onRuntimeInitialized;
        if (!cv) {
          clearTimeout(timeout);
          reject(new Error("The scanner engine could not be loaded."));
          return;
        }
        cv.onRuntimeInitialized = () => {
          clearTimeout(timeout);
          previous?.();
          resolve();
        };
      });
      if (!cv.Mat) throw new Error("The scanner engine did not initialize correctly.");
      return cv;
    }).catch((error) => {
      openCvPromise = undefined;
      throw error;
    });
  }
  return openCvPromise;
}

function readApproximation(approximation, scaleX, scaleY) {
  const values = approximation.data32S;
  const points = [];
  for (let index = 0; index < values.length; index += 2) {
    points.push({ x: values[index] * scaleX, y: values[index + 1] * scaleY });
  }
  return orderDocumentCorners(points);
}

export function detectDocumentCorners(cv, sourceCanvas, options = {}) {
  const maxDimension = options.maxDimension || 760;
  const source = cv.imread(sourceCanvas);
  const working = new cv.Mat();
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const hierarchy = new cv.Mat();
  const contours = new cv.MatVector();
  const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
  const ratio = Math.min(1, maxDimension / Math.max(source.cols, source.rows));
  const workWidth = Math.max(1, Math.round(source.cols * ratio));
  const workHeight = Math.max(1, Math.round(source.rows * ratio));
  let best = null;
  let bestArea = 0;

  try {
    cv.resize(source, working, new cv.Size(workWidth, workHeight), 0, 0, cv.INTER_AREA);
    cv.cvtColor(working, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    cv.Canny(blurred, edges, 60, 180);
    cv.morphologyEx(edges, edges, cv.MORPH_CLOSE, kernel);
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const frameArea = workWidth * workHeight;
    for (let index = 0; index < contours.size(); index += 1) {
      const contour = contours.get(index);
      const approximation = new cv.Mat();
      try {
        const area = Math.abs(cv.contourArea(contour));
        if (area < frameArea * 0.08 || area <= bestArea) continue;
        const perimeter = cv.arcLength(contour, true);
        cv.approxPolyDP(contour, approximation, perimeter * 0.025, true);
        if (approximation.rows !== 4 || !cv.isContourConvex(approximation)) continue;
        best = readApproximation(approximation, 1 / ratio, 1 / ratio);
        bestArea = area;
      } finally {
        approximation.delete();
        contour.delete();
      }
    }
  } finally {
    source.delete();
    working.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    hierarchy.delete();
    contours.delete();
    kernel.delete();
  }

  return best ? { corners: best, confidence: Math.min(1, bestArea / (workWidth * workHeight)) } : null;
}

export function warpDocument(cv, sourceCanvas, corners) {
  const ordered = orderDocumentCorners(corners);
  const { width, height } = getPerspectiveDimensions(ordered);
  const source = cv.imread(sourceCanvas);
  const destination = new cv.Mat();
  const sourcePoints = cv.matFromArray(4, 1, cv.CV_32FC2, ordered.flatMap((point) => [point.x, point.y]));
  const destinationPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, width - 1, 0, width - 1, height - 1, 0, height - 1]);
  const transform = cv.getPerspectiveTransform(sourcePoints, destinationPoints);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  try {
    cv.warpPerspective(source, destination, transform, new cv.Size(width, height), cv.INTER_CUBIC, cv.BORDER_REPLICATE);
    cv.imshow(canvas, destination);
  } finally {
    source.delete();
    destination.delete();
    sourcePoints.delete();
    destinationPoints.delete();
    transform.delete();
  }
  return canvas;
}

export function applyDocumentFilter(cv, sourceCanvas, filterName = "enhanced") {
  const filter = FILTERS.has(filterName) ? filterName : "enhanced";
  const source = cv.imread(sourceCanvas);
  const result = new cv.Mat();
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;

  try {
    if (filter === "original") {
      source.copyTo(result);
    } else if (filter === "grayscale") {
      cv.cvtColor(source, result, cv.COLOR_RGBA2GRAY);
    } else if (filter === "black-white") {
      const gray = new cv.Mat();
      const softened = new cv.Mat();
      try {
        cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
        cv.GaussianBlur(gray, softened, new cv.Size(3, 3), 0, 0, cv.BORDER_DEFAULT);
        cv.adaptiveThreshold(softened, result, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 31, 13);
      } finally {
        gray.delete();
        softened.delete();
      }
    } else {
      const rgb = new cv.Mat();
      const channels = new cv.MatVector();
      const balancedChannels = new cv.MatVector();
      const balanced = new cv.Mat();
      const contrast = new cv.Mat();
      try {
        cv.cvtColor(source, rgb, cv.COLOR_RGBA2RGB);
        cv.split(rgb, channels);
        const means = [0, 1, 2].map((index) => cv.mean(channels.get(index))[0]);
        const target = means.reduce((sum, value) => sum + value, 0) / means.length;
        for (let index = 0; index < 3; index += 1) {
          const channel = channels.get(index);
          const adjusted = new cv.Mat();
          channel.convertTo(adjusted, -1, Math.max(0.72, Math.min(1.38, target / Math.max(1, means[index]))), 0);
          balancedChannels.push_back(adjusted);
          channel.delete();
          adjusted.delete();
        }
        cv.merge(balancedChannels, balanced);
        balanced.convertTo(contrast, -1, 1.16, 7);
        cv.cvtColor(contrast, result, cv.COLOR_RGB2RGBA);
      } finally {
        rgb.delete();
        channels.delete();
        balancedChannels.delete();
        balanced.delete();
        contrast.delete();
      }
    }
    cv.imshow(canvas, result);
  } finally {
    source.delete();
    result.delete();
  }
  return canvas;
}


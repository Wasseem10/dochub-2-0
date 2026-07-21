import { describe, expect, it } from "vitest";
import {
  circleFrameFromDrag,
  directedLineFrameFromPoints,
  directedLineSvgGeometry,
  ensureDirectedLineLength,
  normalizeCircleFrame,
  resizeCircleFrame,
} from "../../src/tools/editorShapeGeometry.js";

describe("editor shape geometry", () => {
  const pageWidth = 760;
  const pageHeight = 984;

  it("draws a true physical circle on a rectangular PDF page", () => {
    const frame = circleFrameFromDrag({ x: 0.1, y: 0.1 }, { x: 0.3, y: 0.2 }, pageWidth, pageHeight);
    expect(frame.w * pageWidth).toBeCloseTo(frame.h * pageHeight, 8);
    expect(frame.w * pageWidth).toBeCloseTo(152, 8);
  });

  it("keeps circles round when normalized and resized from corners or edges", () => {
    const normalized = normalizeCircleFrame({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 }, pageWidth, pageHeight);
    expect(normalized.w * pageWidth).toBeCloseTo(normalized.h * pageHeight, 8);

    const cornerResize = resizeCircleFrame(normalized, "se", 0.08, 0.02, pageWidth, pageHeight);
    expect(cornerResize.w * pageWidth).toBeCloseTo(cornerResize.h * pageHeight, 8);
    expect(cornerResize.x).toBeCloseTo(normalized.x, 8);
    expect(cornerResize.y).toBeCloseTo(normalized.y, 8);

    const edgeResize = resizeCircleFrame(normalized, "e", 0.06, 0, pageWidth, pageHeight);
    expect(edgeResize.w * pageWidth).toBeCloseTo(edgeResize.h * pageHeight, 8);
  });

  it("preserves the direction a user drags an arrow", () => {
    const frame = directedLineFrameFromPoints({ x: 0.7, y: 0.75 }, { x: 0.2, y: 0.25 }, pageWidth, pageHeight);
    const geometry = directedLineSvgGeometry({ ...frame, type: "arrow", strokeWidth: 3 }, frame, pageWidth, pageHeight);
    expect(geometry.start.x).toBeGreaterThan(geometry.end.x);
    expect(geometry.start.y).toBeGreaterThan(geometry.end.y);
    expect(geometry.arrowPoints).toContain(`${geometry.end.x},${geometry.end.y}`);
  });

  it("creates a useful horizontal arrow when the user only clicks", () => {
    const directed = ensureDirectedLineLength({ x: 0.4, y: 0.4 }, { x: 0.4, y: 0.4 }, pageWidth, pageHeight);
    expect(directed.end.x).toBeGreaterThan(directed.start.x);
    expect(directed.end.y).toBe(directed.start.y);
    expect((directed.end.x - directed.start.x) * pageWidth).toBeCloseTo(44, 8);
  });
});

import { describe, expect, it } from "vitest";
import { annotationPatchFromFrame, getAnnotationFrame, moveFrame, normalizeRotation, nudgeFrame, resizeFrame, rotationFromPointer } from "../../src/tools/editorObjectTransforms.js";

describe("shared editor object transforms", () => {
  const frame = { x: 0.2, y: 0.25, w: 0.3, h: 0.2, rotation: 0 };

  it("moves an object while keeping it inside normalized page bounds", () => {
    const moved = moveFrame(frame, 0.1, -0.1);
    expect(moved.x).toBeCloseTo(0.3, 8);
    expect(moved.y).toBeCloseTo(0.15, 8);
    expect(moveFrame(frame, 2, 2)).toMatchObject({ x: 0.7, y: 0.8 });
  });

  it("resizes from all edges and enforces a usable minimum size", () => {
    const northwest = resizeFrame(frame, "nw", 0.05, 0.04);
    expect(northwest.x).toBeCloseTo(0.25, 8);
    expect(northwest.y).toBeCloseTo(0.29, 8);
    expect(northwest.w).toBeCloseTo(0.25, 8);
    expect(northwest.h).toBeCloseTo(0.16, 8);
    const southeast = resizeFrame(frame, "se", 0.1, 0.15);
    expect(southeast.w).toBeCloseTo(0.4, 8);
    expect(southeast.h).toBeCloseTo(0.35, 8);
    const collapsed = resizeFrame(frame, "nw", 1, 1);
    expect(collapsed.w).toBeGreaterThanOrEqual(0.025);
    expect(collapsed.h).toBeGreaterThanOrEqual(0.018);
  });

  it("normalizes rotation and calculates rotation around the object center", () => {
    expect(normalizeRotation(-15)).toBe(345);
    expect(normalizeRotation(375)).toBe(15);
    expect(rotationFromPointer(frame, { left: 0, top: 0, width: 1000, height: 1000 }, 350, 100)).toBe(0);
  });

  it("uses the same frame transform for freehand drawings", () => {
    const drawing = { type: "draw", points: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }], rotation: 0 };
    const original = getAnnotationFrame(drawing);
    const next = moveFrame(original, 0.2, 0.1);
    const patch = annotationPatchFromFrame(drawing, next, original);
    expect(patch.points[0].x).toBeCloseTo(0.3, 5);
    expect(patch.points[0].y).toBeCloseTo(0.3, 5);
    expect(patch.points[1].x).toBeCloseTo(0.5, 5);
    expect(patch.points[1].y).toBeCloseTo(0.5, 5);
  });

  it("nudges selected objects with arrow keys while respecting page bounds", () => {
    expect(nudgeFrame(frame, "ArrowRight", 0.01).x).toBeCloseTo(0.21, 8);
    expect(nudgeFrame(frame, "ArrowUp", 0.01).y).toBeCloseTo(0.24, 8);
    expect(nudgeFrame({ ...frame, x: 0 }, "ArrowLeft", 0.02).x).toBe(0);
  });

  it("moves and resizes stored line endpoints with their selection frame", () => {
    const arrow = {
      type: "arrow",
      x: 0.1,
      y: 0.2,
      w: 0.4,
      h: 0.3,
      startX: 0.48,
      startY: 0.47,
      endX: 0.12,
      endY: 0.23,
    };
    const origin = getAnnotationFrame(arrow);
    const moved = moveFrame(origin, 0.1, 0.05);
    const patch = annotationPatchFromFrame(arrow, moved, origin);
    expect(patch.startX).toBeCloseTo(0.58, 8);
    expect(patch.startY).toBeCloseTo(0.52, 8);
    expect(patch.endX).toBeCloseTo(0.22, 8);
    expect(patch.endY).toBeCloseTo(0.28, 8);
  });
});

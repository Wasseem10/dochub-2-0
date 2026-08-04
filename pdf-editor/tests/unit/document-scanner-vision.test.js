import { describe, expect, it } from "vitest";
import {
  autoPageSizeForAspect,
  defaultDocumentCorners,
  getCornerDrift,
  getPerspectiveDimensions,
  orderDocumentCorners,
} from "../../src/tools/documentScannerVision.js";

describe("document scanner geometry", () => {
  it("orders shuffled corners as top-left, top-right, bottom-right, bottom-left", () => {
    expect(orderDocumentCorners([
      { x: 910, y: 690 },
      { x: 110, y: 90 },
      { x: 80, y: 710 },
      { x: 900, y: 110 },
    ])).toEqual([
      { x: 110, y: 90 },
      { x: 900, y: 110 },
      { x: 910, y: 690 },
      { x: 80, y: 710 },
    ]);
  });

  it("creates editable inset corners and bounded perspective dimensions", () => {
    expect(defaultDocumentCorners(1000, 800, 0.05)).toEqual([
      { x: 50, y: 40 },
      { x: 950, y: 40 },
      { x: 950, y: 760 },
      { x: 50, y: 760 },
    ]);
    expect(getPerspectiveDimensions(defaultDocumentCorners(9000, 6000, 0))).toEqual({ width: 4096, height: 2730 });
  });

  it("normalizes corner drift for stable auto-capture", () => {
    const first = defaultDocumentCorners(1000, 800, 0.1);
    const stable = first.map((point) => ({ x: point.x + 2, y: point.y - 2 }));
    const unstable = first.map((point) => ({ x: point.x + 80, y: point.y + 80 }));
    expect(getCornerDrift(first, stable, 1000, 800)).toBeLessThan(0.012);
    expect(getCornerDrift(first, unstable, 1000, 800)).toBeGreaterThan(0.012);
  });

  it("chooses the closest standard paper ratio", () => {
    expect(autoPageSizeForAspect(210, 297)).toBe("a4");
    expect(autoPageSizeForAspect(850, 1100)).toBe("letter");
  });
});

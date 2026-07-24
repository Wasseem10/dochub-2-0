import { describe, expect, it } from "vitest";
import { centeredAnnotationBounds, pointerToNormalizedPoint } from "../../src/editor/annotationPlacement.mjs";

describe("checkmark placement", () => {
  it("maps the pointer to the same page point at different zoom levels", () => {
    const normal = pointerToNormalizedPoint(
      { clientX: 400, clientY: 600 },
      { left: 100, top: 200, width: 600, height: 800 },
    );
    const zoomed = pointerToNormalizedPoint(
      { clientX: 700, clientY: 1000 },
      { left: 100, top: 200, width: 1200, height: 1600 },
    );

    expect(normal).toEqual({ x: 0.5, y: 0.5 });
    expect(zoomed).toEqual(normal);
  });

  it("accounts for a page that has moved because the editor was scrolled", () => {
    const point = pointerToNormalizedPoint(
      { clientX: 400, clientY: 100 },
      { left: 100, top: -300, width: 600, height: 800 },
    );

    expect(point).toEqual({ x: 0.5, y: 0.5 });
  });

  it("centers the mark on the click and keeps it inside page edges", () => {
    expect(centeredAnnotationBounds({ x: 0.5, y: 0.5 }, 0.04, 0.03)).toEqual({
      x: 0.48,
      y: 0.485,
      w: 0.04,
      h: 0.03,
    });
    expect(centeredAnnotationBounds({ x: 0.005, y: 0.998 }, 0.04, 0.03)).toEqual({
      x: 0,
      y: 0.97,
      w: 0.04,
      h: 0.03,
    });
  });
});

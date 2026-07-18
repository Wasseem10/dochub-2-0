import { describe, expect, it } from "vitest";
import { normalizedPointerInRect } from "../../src/tools/editorPointerCoordinates.js";

describe("editor pointer coordinates", () => {
  it("maps the cursor into the exact drawing-layer rectangle", () => {
    expect(normalizedPointerInRect(
      { clientX: 380, clientY: 470 },
      { left: 100, top: 200, width: 560, height: 720 },
    )).toEqual({ x: 0.5, y: 0.375 });
  });

  it("stays accurate when zooming or scrolling changes the layer rectangle", () => {
    const pointer = { clientX: 540, clientY: 410 };
    expect(normalizedPointerInRect(pointer, { left: 260, top: 50, width: 1120, height: 1440 })).toEqual({ x: 0.25, y: 0.25 });
    expect(normalizedPointerInRect(pointer, { left: 400, top: 230, width: 560, height: 720 })).toEqual({ x: 0.25, y: 0.25 });
  });

  it("clamps pointers outside the drawing layer", () => {
    expect(normalizedPointerInRect(
      { clientX: -50, clientY: 900 },
      { left: 100, top: 200, width: 560, height: 720 },
    )).toEqual({ x: 0, y: 0.9722222222222222 });
  });
});

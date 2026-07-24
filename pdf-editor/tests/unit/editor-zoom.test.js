import { describe, expect, it } from "vitest";
import { calculateEditorFitZoom, EDITOR_ZOOM_MODE, editorZoomLabel } from "../../src/tools/editorZoom.js";

describe("editor zoom modes", () => {
  it("fits a page to the available phone width", () => {
    expect(calculateEditorFitZoom({
      mode: EDITOR_ZOOM_MODE.FIT_WIDTH,
      pageWidth: 760,
      pageHeight: 984,
      containerWidth: 390,
      containerHeight: 650,
      pageScale: 0.74,
    })).toBe(65);
  });

  it("uses both dimensions when fitting a full page", () => {
    expect(calculateEditorFitZoom({
      mode: EDITOR_ZOOM_MODE.FIT_PAGE,
      pageWidth: 760,
      pageHeight: 984,
      containerWidth: 1024,
      containerHeight: 700,
      pageScale: 0.74,
    })).toBe(83);
  });

  it("labels automatic modes honestly", () => {
    expect(editorZoomLabel(EDITOR_ZOOM_MODE.FIT_WIDTH, 65)).toBe("Fit width");
    expect(editorZoomLabel(EDITOR_ZOOM_MODE.FIT_PAGE, 65)).toBe("Fit page");
    expect(editorZoomLabel(EDITOR_ZOOM_MODE.CUSTOM, 100)).toBe("100%");
  });
});

import { describe, expect, it } from "vitest";
import {
  backgroundColorFromSamples,
  canMergeDetectedTextRuns,
  detectedTextBaseline,
  detectedTextRotation,
  detectedTextSourceFrame,
  layoutDetectedText,
  resolveDetectedTextStyle,
  standardPdfFontVariant,
} from "../../src/tools/editorDetectedText.js";

describe("editor detected text fidelity", () => {
  it("uses PDF.js font metadata and recognizes common font variants", () => {
    expect(resolveDetectedTextStyle({ F1: { fontFamily: "Times New Roman Bold Italic" } }, "F1")).toEqual({
      fontFamily: "Times New Roman Bold Italic",
      bold: true,
      italic: true,
      monospace: false,
      serif: true,
    });
    expect(standardPdfFontVariant("Times New Roman", true, true)).toBe("timesBoldItalic");
    expect(standardPdfFontVariant("Courier New", false, true)).toBe("courierItalic");
    expect(standardPdfFontVariant("Arial", true, false)).toBe("helveticaBold");
  });

  it("uses a median background sample so nearby text pixels do not create a dark replacement box", () => {
    expect(backgroundColorFromSamples([
      [245, 240, 230],
      [245, 240, 230],
      [12, 12, 12],
      [244, 239, 229],
      [246, 241, 231],
    ])).toBe("#f5f0e6");
  });

  it("places replacement text on the original detected baseline", () => {
    expect(detectedTextBaseline({ y: 0.2, baselineOffset: 0.03 }, 800, 40, 12)).toBe(616);
  });

  it("preserves the source text rotation", () => {
    expect(detectedTextRotation([0, 12, -12, 0, 20, 30])).toBe(90);
    expect(detectedTextRotation([10, 0, 0, 10, 20, 30])).toBe(0);
  });

  it("keeps an immutable source frame separate from the editable destination frame", () => {
    expect(detectedTextSourceFrame({
      x: 0.4,
      y: 0.5,
      w: 0.3,
      h: 0.1,
      sourceX: 0.1,
      sourceY: 0.2,
      sourceW: 0.18,
      sourceH: 0.04,
    })).toEqual({ x: 0.1, y: 0.2, w: 0.18, h: 0.04 });
    expect(detectedTextSourceFrame({
      x: 0.4,
      y: 0.5,
      w: 0.3,
      h: 0.1,
      hasSourceText: false,
    })).toBeNull();
  });

  it("does not merge separate nearby text runs or mixed styles into one edit target", () => {
    const baseRun = {
      fontFamily: "Times New Roman",
      fontSize: 12,
      bold: false,
      italic: false,
      rotation: 0,
    };
    expect(canMergeDetectedTextRuns(baseRun, { ...baseRun }, { gap: 3, averageHeight: 12 })).toBe(true);
    expect(canMergeDetectedTextRuns(baseRun, { ...baseRun }, { gap: 8, averageHeight: 12 })).toBe(false);
    expect(canMergeDetectedTextRuns(baseRun, { ...baseRun, bold: true }, { gap: 0, averageHeight: 12 })).toBe(false);
  });

  it("wraps and shrinks replacement text to the detected box", () => {
    const layout = layoutDetectedText("A longer replacement sentence", {
      fontSize: 12,
      minimumFontSize: 8,
      maximumWidth: 88,
      maximumHeight: 42,
      measure: (value, size) => value.length * size * 0.5,
    });
    expect(layout.lines.length).toBeGreaterThan(1);
    expect(layout.fontSize).toBeGreaterThanOrEqual(8);
    expect(Math.max(...layout.lines.map((line) => line.length * layout.fontSize * 0.5))).toBeLessThanOrEqual(88);
  });
});

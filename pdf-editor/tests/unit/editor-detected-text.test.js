import { describe, expect, it } from "vitest";
import {
  backgroundColorFromSamples,
  detectedTextBaseline,
  detectedTextRotation,
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

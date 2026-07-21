import { describe, expect, it } from "vitest";
import {
  backgroundColorFromSamples,
  detectedTextBaseline,
  resolveDetectedTextStyle,
  standardPdfFontVariant,
} from "../../src/tools/editorDetectedText.js";

describe("editor detected text fidelity", () => {
  it("uses PDF.js font metadata and recognizes common font variants", () => {
    expect(resolveDetectedTextStyle({ F1: { fontFamily: "Times New Roman Bold Italic" } }, "F1")).toEqual({
      fontFamily: "Times New Roman Bold Italic",
      bold: true,
      italic: true,
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
});

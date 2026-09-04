import { describe, expect, it } from "vitest";
import { createTextAnnotation, EDITOR_TEXT_MIN_HEIGHT, EDITOR_TEXT_MIN_WIDTH, estimateTextAnnotationSize, normalizeEditorText, shouldDiscardTextAnnotation } from "../../src/tools/editorTextObjects.js";

const settings = {
  textColor: "#111827",
  textSize: 16,
  fontFamily: "Inter",
  textAlign: "left",
  lineHeight: 1.25,
  textBold: false,
  textItalic: false,
  textUnderline: false,
};

describe("editor text objects", () => {
  it("creates a selected-ready blank text box with stable normalized coordinates", () => {
    const text = createTextAnnotation({ id: "text-1", page: 0, point: { x: 0.97, y: 0.99 }, settings, createdAt: "2026-07-16T00:00:00.000Z" });
    expect(text).toMatchObject({ id: "text-1", type: "text", content: "", w: EDITOR_TEXT_MIN_WIDTH, fontFamily: "Inter" });
    expect(text.h).toBeGreaterThanOrEqual(EDITOR_TEXT_MIN_HEIGHT);
    expect(text.h).toBeLessThan(0.035);
    expect(text.x + text.w).toBeLessThanOrEqual(0.96);
    expect(text.y + text.h).toBeLessThanOrEqual(0.97);
  });

  it("preserves intentional line breaks and saves text content without placeholder spaces", () => {
    expect(normalizeEditorText("First\r\nSecond")).toBe("First\nSecond");
    expect(normalizeEditorText("First\rSecond")).toBe("First\nSecond");
    const text = createTextAnnotation({ id: "text-2", page: 1, point: { x: 0.2, y: 0.3 }, content: "First\r\nSecond  ", settings, createdAt: "now" });
    expect(text.content).toBe("First\nSecond");
    expect(text.h).toBeGreaterThan(0.038);
  });

  it("discards abandoned empty text boxes but keeps meaningful whitespace inside text", () => {
    expect(shouldDiscardTextAnnotation(" \n ")).toBe(true);
    expect(shouldDiscardTextAnnotation(" A ")).toBe(false);
  });

  it("auto-sizes new text so short labels are not clipped and multiline text grows vertically", () => {
    const short = estimateTextAnnotationSize({ content: "Audit text", fontSize: 16 });
    const multiline = estimateTextAnnotationSize({ content: "First line\nSecond line\nThird line", fontSize: 16 });
    expect(short.w).toBeGreaterThanOrEqual(EDITOR_TEXT_MIN_WIDTH);
    expect(multiline.h).toBeGreaterThan(short.h);
  });

  it("bases sizing only on text content instead of the box's previous dimensions", () => {
    const options = {
      content: "hi howa",
      fontSize: 16,
      pageWidth: 560,
      pageHeight: 726,
      measureLine: (line) => line.length * 8,
    };

    expect(estimateTextAnnotationSize(options)).toEqual(estimateTextAnnotationSize(options));
    const estimated = estimateTextAnnotationSize(options);
    expect(estimated.w).toBeLessThan(0.12);
    expect(estimated.h).toBeLessThan(0.04);
  });

  it("does not add a phantom line when measured text fits at a sub-pixel boundary", () => {
    const estimated = estimateTextAnnotationSize({
      content: "hi how are",
      fontSize: 25.6,
      pageWidth: 1124,
      pageHeight: 1455,
      measureLine: () => 118.1125,
    });

    expect(estimated.h).toBe(EDITOR_TEXT_MIN_HEIGHT);
  });

  it("caps long text at the available width and adds wrapped lines vertically", () => {
    const short = estimateTextAnnotationSize({ content: "Short", fontSize: 16, pageWidth: 560, pageHeight: 726 });
    const wrapped = estimateTextAnnotationSize({
      content: "A very long sentence that needs to wrap cleanly inside a text box near the page edge.",
      fontSize: 16,
      pageWidth: 560,
      pageHeight: 726,
      maxWidth: 0.3,
    });

    expect(wrapped.w).toBe(0.3);
    expect(wrapped.h).toBeGreaterThan(short.h);
  });

  it("shrinks back to the minimum frame after content is deleted", () => {
    const long = estimateTextAnnotationSize({ content: "This is a longer text value", fontSize: 16, pageWidth: 560, pageHeight: 726 });
    const deleted = estimateTextAnnotationSize({ content: "A", fontSize: 16, pageWidth: 560, pageHeight: 726 });

    expect(deleted.w).toBe(EDITOR_TEXT_MIN_WIDTH);
    expect(deleted.h).toBeLessThan(0.04);
    expect(deleted.w).toBeLessThan(long.w);
  });
});

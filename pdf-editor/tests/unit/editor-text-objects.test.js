import { describe, expect, it } from "vitest";
import { createTextAnnotation, normalizeEditorText, shouldDiscardTextAnnotation } from "../../src/tools/editorTextObjects.js";

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
    expect(text).toMatchObject({ id: "text-1", type: "text", content: "", w: 0.11, h: 0.038, fontFamily: "Inter" });
    expect(text.x + text.w).toBeLessThanOrEqual(0.96);
    expect(text.y + text.h).toBeLessThanOrEqual(0.97);
  });

  it("preserves intentional line breaks and saves text content without placeholder spaces", () => {
    expect(normalizeEditorText("First\r\nSecond")).toBe("First\nSecond");
    const text = createTextAnnotation({ id: "text-2", page: 1, point: { x: 0.2, y: 0.3 }, content: "First\r\nSecond  ", settings, createdAt: "now" });
    expect(text.content).toBe("First\nSecond");
    expect(text.h).toBeGreaterThan(0.038);
  });

  it("discards abandoned empty text boxes but keeps meaningful whitespace inside text", () => {
    expect(shouldDiscardTextAnnotation(" \n ")).toBe(true);
    expect(shouldDiscardTextAnnotation(" A ")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { estimateTextAnnotationSize, wrapEditorText } from "../../src/tools/editorTextObjects.js";

describe("text frame wrapping", () => {
  const measure = (text) => text.length * 10;
  it("wraps at words while retaining paragraphs and splitting long words", () => {
    expect(wrapEditorText("one two three\nfour\n\nsuperlongword", 70, measure)).toEqual(["one two", "three", "four", "", "superlo", "ngword"]);
  });
  it("keeps a manually chosen width and grows vertically for wrapped text", () => {
    const options = { pageWidth: 1000, pageHeight: 1000, minWidth: 0.2, maxWidth: 0.2, measureLine: measure };
    const short = estimateTextAnnotationSize({ ...options, content: "hello" });
    const long = estimateTextAnnotationSize({ ...options, content: "This is a longer paragraph with enough words to wrap to several lines." });
    expect(short.w).toBe(0.2);
    expect(long.w).toBe(0.2);
    expect(long.h).toBeGreaterThan(short.h);
  });
});

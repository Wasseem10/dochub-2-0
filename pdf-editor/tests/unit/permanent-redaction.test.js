import { describe, expect, it } from "vitest";
import { isUsableRedaction, normalizeRedactionRect, redactionsForPage } from "../../src/tools/permanentRedactionGeometry.js";

describe("permanent redaction geometry", () => {
  it("normalizes reverse drags and clamps marks to a page", () => {
    expect(normalizeRedactionRect({ x: 1.2, y: 0.9 }, { x: -0.2, y: 0.1 })).toEqual({ x: 0, y: 0.1, width: 1, height: 0.8 });
  });

  it("ignores accidental clicks and groups valid marks by page", () => {
    const marks = [
      { pageIndex: 0, x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
      { pageIndex: 0, x: 0.2, y: 0.2, width: 0.001, height: 0.1 },
      { pageIndex: 1, x: 0.4, y: 0.4, width: 0.2, height: 0.2 },
    ];
    expect(isUsableRedaction(marks[0])).toBe(true);
    expect(isUsableRedaction(marks[1])).toBe(false);
    expect(redactionsForPage(marks, 0)).toEqual([marks[0]]);
  });
});

import { describe, expect, it } from "vitest";
import { mostVisibleEditorPage } from "../../src/editor/useContinuousEditorPages.js";

describe("continuous editor page selection", () => {
  it("follows scrolling down and back up across page boundaries", () => {
    expect(mostVisibleEditorPage([{ index: 0, top: -700, bottom: 100 }, { index: 1, top: 128, bottom: 928 }], 0, 600, 0)).toBe(1);
    expect(mostVisibleEditorPage([{ index: 0, top: -100, bottom: 700 }, { index: 1, top: 728, bottom: 1528 }], 0, 600, 1)).toBe(0);
  });
  it("retains the current page on ties and when no page is visible", () => {
    expect(mostVisibleEditorPage([{ index: 0, top: -200, bottom: 200 }, { index: 1, top: 400, bottom: 800 }], 0, 600, 1)).toBe(1);
    expect(mostVisibleEditorPage([], 0, 600, 2)).toBe(2);
  });
});

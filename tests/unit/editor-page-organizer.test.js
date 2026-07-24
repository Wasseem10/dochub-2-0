import { describe, expect, it } from "vitest";
import { duplicateEditorPageState, rotateEditorPageRecord } from "../../src/tools/editorPageOrganizer.js";

describe("editor page organizer", () => {
  it("duplicates a page with its annotations and shifts following page content", () => {
    let id = 0;
    const state = duplicateEditorPageState({
      pages: [
        { id: "p1", number: 1, source: "pdf", originalIndex: 0 },
        { id: "p2", number: 2, source: "pdf", originalIndex: 1 },
      ],
      annotations: [
        { id: "a1", type: "text", page: 0, content: "First" },
        { id: "a2", type: "text", page: 1, content: "Second" },
      ],
      detectedTextItems: [{ id: "d1", pageNumber: 0, currentText: "Detected" }],
      pageIndex: 0,
      makeId: (prefix) => `${prefix}-${++id}`,
    });

    expect(state.pages).toHaveLength(3);
    expect(state.pages.map((page) => page.number)).toEqual([1, 2, 3]);
    expect(state.pages[1].originalIndex).toBe(0);
    expect(state.annotations.filter((item) => item.page === 1).map((item) => item.content)).toContain("First");
    expect(state.annotations.find((item) => item.content === "Second").page).toBe(2);
    expect(state.detectedTextItems.filter((item) => item.pageNumber === 1)).toHaveLength(1);
    expect(state.pageIndex).toBe(1);
  });

  it("rotates blank and PDF page records without requiring a raster image", () => {
    expect(rotateEditorPageRecord({ width: 760, height: 984, rotation: 0, source: "blank" })).toMatchObject({ width: 984, height: 760, rotation: 90 });
    expect(rotateEditorPageRecord({ width: 984, height: 760, rotation: 270, source: "pdf" })).toMatchObject({ width: 760, height: 984, rotation: 0 });
  });
});

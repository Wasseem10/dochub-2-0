import { describe, expect, it } from "vitest";
import { publicEditorPath } from "../../src/router/routePaths.js";
import { EDITOR_TOOL_PRESETS, getEditorToolPreset, resolveEditorActiveTool } from "../../src/tools/editorToolPresets.js";
import { TOOL_BY_ID } from "../../src/tools/toolRegistry.js";

describe("editor tool launch presets", () => {
  it("routes every implemented screenshot workflow to a specific editor intent", () => {
    const expectedTools = [
      "edit-pdf", "annotate-pdf", "pdf-reader", "fill-pdf", "pdf-form-filler",
      "sign-pdf", "add-initials", "add-date-fields",
    ];
    expect(Object.keys(EDITOR_TOOL_PRESETS)).toEqual(expectedTools);
    expectedTools.forEach((toolId) => {
      expect(TOOL_BY_ID.get(toolId)?.status).toBe("partial");
      expect(publicEditorPath(toolId)).toBe(`/edit-pdf?tool=${toolId}`);
    });
  });

  it("opens the intended editor control and gives text editing a useful scanned-PDF fallback", () => {
    expect(resolveEditorActiveTool("annotate-pdf", 12)).toBe("highlight");
    expect(resolveEditorActiveTool("fill-pdf", 12)).toBe("field");
    expect(resolveEditorActiveTool("add-initials", 12)).toBe("initials");
    expect(resolveEditorActiveTool("edit-pdf", 12)).toBe("editText");
    expect(resolveEditorActiveTool("edit-pdf", 0)).toBe("text");
    expect(getEditorToolPreset("pdf-to-word")).toBeNull();
  });
});

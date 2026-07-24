import { describe, expect, it } from "vitest";
import { EDITOR_TOOL_MODES, getDefaultToolForMode, getToolsForMode, isToolInMode, resolveModeForTool } from "../../src/tools/editorToolModes.js";

describe("editor toolbar modes", () => {
  it("exposes the six released desktop modes with operational tools only", () => {
    expect(EDITOR_TOOL_MODES.map((mode) => mode.label)).toEqual(["View", "Annotate", "Shapes", "Insert", "Edit", "Fill & Sign"]);
    expect(EDITOR_TOOL_MODES.every((mode) => mode.tools.length > 0)).toBe(true);
    expect(EDITOR_TOOL_MODES.flatMap((mode) => mode.tools)).not.toContain("comingSoon");
  });

  it("activates the correct default tool for every mode", () => {
    expect(getDefaultToolForMode("view")).toBe("select");
    expect(getDefaultToolForMode("annotate")).toBe("highlight");
    expect(getDefaultToolForMode("shapes")).toBe("rectangle");
    expect(getDefaultToolForMode("insert")).toBe("text");
    expect(getDefaultToolForMode("edit")).toBe("editText");
    expect(getDefaultToolForMode("fillSign")).toBe("signature");
  });

  it("keeps shared tools in the selected mode and otherwise resolves their canonical mode", () => {
    expect(resolveModeForTool("date", "fillSign")).toBe("fillSign");
    expect(resolveModeForTool("date", "insert")).toBe("insert");
    expect(resolveModeForTool("arrow", "view")).toBe("shapes");
    expect(resolveModeForTool("unknown", "annotate")).toBe("view");
    expect(isToolInMode("draw", "annotate")).toBe(true);
    expect(getToolsForMode("fillSign")).toContain("checkbox");
  });
});

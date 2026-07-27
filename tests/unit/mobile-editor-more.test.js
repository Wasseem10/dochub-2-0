import { describe, expect, it } from "vitest";
import {
  MOBILE_EDITOR_DOCK_TOOL_IDS,
  MOBILE_EDITOR_MORE_GROUPS,
  MOBILE_EDITOR_MORE_TOOL_IDS,
} from "../../src/tools/mobileEditorMore.js";

describe("mobile editor More sheet", () => {
  it("contains the complete hidden editor toolset without duplicating dock actions", () => {
    expect(MOBILE_EDITOR_MORE_TOOL_IDS).toEqual(expect.arrayContaining([
      "editText",
      "draw",
      "erase",
      "highlight",
      "textHighlight",
      "whiteout",
      "image",
      "stamp",
      "link",
      "note",
      "checkbox",
      "field",
      "date",
      "initials",
      "arrow",
      "line",
      "rectangle",
      "circle",
    ]));
    expect(new Set(MOBILE_EDITOR_MORE_TOOL_IDS).size).toBe(MOBILE_EDITOR_MORE_TOOL_IDS.length);
    expect(MOBILE_EDITOR_MORE_TOOL_IDS.some((id) => MOBILE_EDITOR_DOCK_TOOL_IDS.includes(id))).toBe(false);
  });

  it("groups tools into scannable editing, insertion, and shape sections", () => {
    expect(MOBILE_EDITOR_MORE_GROUPS.map((group) => group.label)).toEqual([
      "Edit & mark up",
      "Insert",
      "Shapes",
    ]);
  });
});

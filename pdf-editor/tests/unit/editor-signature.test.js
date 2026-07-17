import { describe, expect, it } from "vitest";
import { canSaveEditorSignature } from "../../src/tools/editorSignature.js";

describe("editor signature validation", () => {
  it("keeps empty signature actions disabled for every creation method", () => {
    expect(canSaveEditorSignature({ tab: "draw" })).toBe(false);
    expect(canSaveEditorSignature({ tab: "type", typedName: "  " })).toBe(false);
    expect(canSaveEditorSignature({ tab: "upload", uploadedImage: "" })).toBe(false);
    expect(canSaveEditorSignature({ mode: "initials", typedName: "" })).toBe(false);
  });

  it("enables saving only after the active method contains a signature", () => {
    expect(canSaveEditorSignature({ tab: "draw", hasInk: true })).toBe(true);
    expect(canSaveEditorSignature({ tab: "type", typedName: "Ada Lovelace" })).toBe(true);
    expect(canSaveEditorSignature({ tab: "upload", uploadedImage: "data:image/png;base64,test" })).toBe(true);
    expect(canSaveEditorSignature({ mode: "initials", typedName: "Ada Lovelace" })).toBe(true);
  });
});

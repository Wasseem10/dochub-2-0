import { describe, expect, it } from "vitest";
import { EDITOR_LIMITS, validateEditorPageCount, validateEditorPdfFile } from "../../src/config/editorLimits.js";

describe("editor upload limits", () => {
  it("accepts valid PDFs at the 8 MB boundary and rejects larger files", () => {
    expect(validateEditorPdfFile({ name: "valid.pdf", type: "application/pdf", size: EDITOR_LIMITS.maxFileBytes })).toBeNull();
    expect(validateEditorPdfFile({ name: "large.pdf", type: "application/pdf", size: EDITOR_LIMITS.maxFileBytes + 1 })?.errorCategory).toBe("file_size");
    expect(validateEditorPdfFile({ name: "image.jpg", type: "image/jpeg", size: 10 })?.errorCategory).toBe("file_type");
  });

  it("accepts 100 pages and reports larger documents clearly", () => {
    expect(validateEditorPageCount(100)).toBeNull();
    expect(validateEditorPageCount(101)).toEqual({ errorCategory: "page_count", message: "This PDF has 101 pages. The editor limit is 100 pages." });
  });
});

const PRESETS = Object.freeze({
  "edit-pdf": { activeTool: "editText", fallbackTool: "text", label: "Edit PDF" },
  "annotate-pdf": { activeTool: "highlight", label: "Annotate PDF" },
  "pdf-reader": { activeTool: "select", label: "PDF Reader" },
  "fill-pdf": { activeTool: "field", label: "Fill PDF" },
  "pdf-form-filler": { activeTool: "field", label: "PDF Form Filler" },
  "sign-pdf": { activeTool: "signature", label: "Sign PDF" },
  "add-initials": { activeTool: "initials", label: "Add Initials" },
  "add-date-fields": { activeTool: "date", label: "Add Date Fields" },
  "request-signatures": { activeTool: "field", label: "Request Signatures" },
  "protect-pdf": { activeTool: "select", label: "Protect PDF" },
  "review-pdf": { activeTool: "highlight", label: "Review PDF", openComments: true },
  "comment-on-pdf": { activeTool: "comment", label: "Comment on PDF", openComments: true },
});

export const EDITOR_TOOL_PRESETS = PRESETS;

export function getEditorToolPreset(toolId) {
  return PRESETS[toolId] || null;
}

export function resolveEditorActiveTool(toolId, detectedTextCount = 0) {
  const preset = getEditorToolPreset(toolId);
  if (!preset) return detectedTextCount > 0 ? "editText" : "select";
  if (preset.activeTool === "editText" && detectedTextCount === 0) return preset.fallbackTool || "text";
  return preset.activeTool;
}

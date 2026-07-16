export const EDITOR_TOOL_MODES = [
  { id: "view", label: "View", defaultTool: "select", tools: ["select"] },
  { id: "annotate", label: "Annotate", defaultTool: "highlight", tools: ["highlight", "draw", "comment", "whiteout"] },
  { id: "shapes", label: "Shapes", defaultTool: "rectangle", tools: ["rectangle", "circle", "line", "arrow"] },
  { id: "insert", label: "Insert", defaultTool: "text", tools: ["text", "image", "date"] },
  { id: "edit", label: "Edit", defaultTool: "editText", tools: ["editText", "select"] },
  { id: "fillSign", label: "Fill & Sign", defaultTool: "signature", tools: ["signature", "initials", "checkbox", "field", "date"] },
];

const MODE_BY_ID = new Map(EDITOR_TOOL_MODES.map((mode) => [mode.id, mode]));

export function getEditorToolMode(modeId) {
  return MODE_BY_ID.get(modeId) || MODE_BY_ID.get("view");
}

export function getToolsForMode(modeId) {
  return getEditorToolMode(modeId).tools;
}

export function getDefaultToolForMode(modeId) {
  return getEditorToolMode(modeId).defaultTool;
}

export function resolveModeForTool(toolId, currentModeId = "view") {
  const currentMode = getEditorToolMode(currentModeId);
  if (currentMode.tools.includes(toolId)) return currentMode.id;
  return EDITOR_TOOL_MODES.find((mode) => mode.tools.includes(toolId))?.id || "view";
}

export function isToolInMode(toolId, modeId) {
  return getEditorToolMode(modeId).tools.includes(toolId);
}

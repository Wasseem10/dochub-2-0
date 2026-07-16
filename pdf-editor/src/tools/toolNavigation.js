import { TOOL_CATEGORIES, TOOL_REGISTRY } from "./toolRegistry.js";

export const MEGA_MENU_CATEGORY_IDS = Object.freeze([
  "edit-view",
  "organize",
  "from-pdf",
  "to-pdf",
  "sign",
  "protect",
  "ai",
  "ocr-scan",
]);

export function getToolMenuGroups(limit = 3) {
  return MEGA_MENU_CATEGORY_IDS.map((categoryId) => {
    const category = TOOL_CATEGORIES.find((item) => item.id === categoryId);
    const tools = TOOL_REGISTRY
      .filter((tool) => tool.category === categoryId)
      .sort((a, b) => Number(b.uploadEnabled) - Number(a.uploadEnabled))
      .slice(0, limit);
    return { ...category, tools };
  });
}

export const FOOTER_TOOL_GROUPS = Object.freeze([
  { label: "Edit PDF", categoryIds: ["edit-view"], limit: 5 },
  { label: "Organize PDF", categoryIds: ["organize", "compress"], limit: 5 },
  { label: "Convert from PDF", categoryIds: ["from-pdf"], limit: 5 },
  { label: "Convert to PDF", categoryIds: ["to-pdf"], limit: 5 },
  { label: "Sign and protect", categoryIds: ["sign", "protect"], limit: 5 },
  { label: "AI and OCR", categoryIds: ["ai", "ocr-scan"], limit: 5 },
].map((group) => ({
  ...group,
  tools: TOOL_REGISTRY
    .filter((tool) => group.categoryIds.includes(tool.category))
    .sort((a, b) => Number(b.uploadEnabled) - Number(a.uploadEnabled))
    .slice(0, group.limit),
})));

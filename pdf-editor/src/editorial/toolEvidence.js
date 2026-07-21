import evidenceRecords from "../../config/priority-two-evidence.mjs";

export const PRODUCT_LAST_TESTED_ISO = "2026-07-21";
export const PRODUCT_LAST_TESTED_LABEL = "July 21, 2026";
export const PRODUCT_RESPONSIBLE_PARTY = "FixThatPDF Product Engineering";
export const CORE_EDITORIAL_TOOL_IDS = Object.freeze(evidenceRecords.map(({ toolId }) => toolId));

const evidenceById = new Map(evidenceRecords.map((record) => [record.toolId, Object.freeze(record)]));

/** @param {string} toolId */
export function getToolEvidence(toolId) {
  return evidenceById.get(toolId) || null;
}

/** @param {string} path */
export function hasToolShareImage(path) {
  const slug = String(path || "").replace(/^\//, "").replace(/\/$/, "");
  return CORE_EDITORIAL_TOOL_IDS.includes(slug);
}

/** @param {string} path */
export function editorialShareImagePath(path) {
  const slug = String(path || "/").replace(/^\//, "").replace(/\/$/, "").replaceAll("/", "-") || "home";
  return `/share/${slug}.png`;
}

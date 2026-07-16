import { describe, expect, it } from "vitest";
import { FOOTER_TOOL_GROUPS, getToolMenuGroups, MEGA_MENU_CATEGORY_IDS } from "../../src/tools/toolNavigation.js";
import { TOOL_CATEGORIES, TOOL_REGISTRY, validateToolRegistry } from "../../src/tools/toolRegistry.js";

const requiredFields = [
  "id", "slug", "route", "name", "shortDescription", "longDescription", "category", "categoryName",
  "icon", "accentColor", "status", "supportedInputTypes", "supportedOutputTypes", "uploadEnabled",
  "opensEditor", "workflowType", "currentLimitations", "availabilityLabel", "seoTitle", "metaDescription", "heroHeadline",
  "heroSubheadline", "benefits", "steps", "useCases", "faqEntries", "relatedTools", "canonicalUrl", "schemaType",
];

describe("FixThatPDF tool registry", () => {
  it("contains the complete 68-tool catalog with a valid unique schema", () => {
    expect(TOOL_REGISTRY).toHaveLength(68);
    expect(TOOL_CATEGORIES).toHaveLength(11);
    expect(validateToolRegistry()).toEqual([]);
    TOOL_REGISTRY.forEach((tool) => requiredFields.forEach((field) => expect(tool, `${tool.id}.${field}`).toHaveProperty(field)));
  });

  it("truthfully exposes released editor and conversion workflows", () => {
    const counts = Object.groupBy(TOOL_REGISTRY, (tool) => tool.status);
    expect(counts.partial || []).toHaveLength(0);
    expect(counts.available).toHaveLength(24);
    expect(counts.beta || []).toHaveLength(0);
    expect(counts["coming-soon"]).toHaveLength(44);
    expect(TOOL_REGISTRY.filter((tool) => tool.workflowType === "converter").every((tool) => tool.uploadEnabled && !tool.opensEditor && tool.status === "available")).toBe(true);
    expect(TOOL_REGISTRY.filter((tool) => tool.workflowType === "page-tool").every((tool) => tool.uploadEnabled && !tool.opensEditor && tool.status === "available")).toBe(true);
    expect(TOOL_REGISTRY.filter((tool) => tool.workflowType === "editor").every((tool) => tool.opensEditor && tool.status === "available")).toBe(true);
    expect(TOOL_REGISTRY.filter((tool) => tool.status === "coming-soon").every((tool) => !tool.uploadEnabled && !tool.opensEditor)).toBe(true);
  });

  it("drives the eight-category menu and grouped footer from registry entries", () => {
    const menuGroups = getToolMenuGroups(2);
    expect(menuGroups.map(({ id }) => id)).toEqual(MEGA_MENU_CATEGORY_IDS);
    expect(menuGroups.every(({ tools }) => tools.length > 0 && tools.length <= 2)).toBe(true);
    expect(FOOTER_TOOL_GROUPS).toHaveLength(6);
    expect(FOOTER_TOOL_GROUPS.every(({ tools }) => tools.length > 0 && tools.length <= 5)).toBe(true);
  });
});

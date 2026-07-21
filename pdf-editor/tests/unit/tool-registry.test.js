import { describe, expect, it } from "vitest";
import { FOOTER_TOOL_GROUPS, getToolMenuGroups, MEGA_MENU_CATEGORY_IDS } from "../../src/tools/toolNavigation.js";
import { TOOL_CATEGORY_PAGES } from "../../src/tools/toolCategoryPages.js";
import { HIGH_INTENT_TOOL_IDS } from "../../src/tools/highIntentToolContent.js";
import { TOOL_CATEGORIES, TOOL_REGISTRY, validateToolRegistry } from "../../src/tools/toolRegistry.js";
import { toolSeoSchemas } from "../../src/tools/toolSeoSchemas.js";

const requiredFields = [
  "id", "slug", "route", "name", "shortDescription", "longDescription", "category", "categoryName",
  "icon", "accentColor", "status", "supportedInputTypes", "supportedOutputTypes", "uploadEnabled",
  "opensEditor", "workflowType", "currentLimitations", "availabilityLabel", "seoTitle", "metaDescription", "heroHeadline",
  "heroSubheadline", "benefits", "steps", "useCases", "faqEntries", "privacySummary", "verificationChecklist",
  "troubleshooting", "relatedTools", "canonicalUrl", "schemaType",
];

describe("FixThatPDF tool registry", () => {
  it("contains the complete 68-tool catalog with a valid unique schema", () => {
    expect(TOOL_REGISTRY).toHaveLength(68);
    expect(TOOL_CATEGORIES).toHaveLength(11);
    expect(validateToolRegistry()).toEqual([]);
    TOOL_REGISTRY.forEach((tool) => requiredFields.forEach((field) => expect(tool, `${tool.id}.${field}`).toHaveProperty(field)));
    expect(TOOL_REGISTRY.every((tool) => !tool.heroHeadline.includes("honest limits"))).toBe(true);
  });

  it("truthfully exposes released editor and conversion workflows", () => {
    const counts = Object.groupBy(TOOL_REGISTRY, (tool) => tool.status);
    expect(counts.partial || []).toHaveLength(0);
    expect(counts.available).toHaveLength(67);
    expect(counts.beta || []).toHaveLength(1);
    expect(counts["coming-soon"] || []).toHaveLength(0);
    expect(TOOL_REGISTRY.find((tool) => tool.id === "redact-pdf")).toMatchObject({ status: "available", workflowType: "page-tool", opensEditor: false });
    expect(TOOL_REGISTRY.filter((tool) => tool.workflowType === "converter").every((tool) => tool.uploadEnabled && !tool.opensEditor && ["available", "beta"].includes(tool.status))).toBe(true);
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

  it("provides one unique indexable hub for every tool category", () => {
    expect(TOOL_CATEGORY_PAGES).toHaveLength(TOOL_CATEGORIES.length);
    expect(new Set(TOOL_CATEGORY_PAGES.map(({ route }) => route)).size).toBe(TOOL_CATEGORY_PAGES.length);
    expect(TOOL_CATEGORY_PAGES.every(({ seoTitle, metaDescription, guidance }) => seoTitle.includes("FixThatPDF") && metaDescription.length > 80 && guidance.length === 3)).toBe(true);
  });

  it("provides substantial, unique guidance for the ten highest-intent tools", () => {
    expect(HIGH_INTENT_TOOL_IDS).toHaveLength(10);
    for (const toolId of HIGH_INTENT_TOOL_IDS) {
      const tool = TOOL_REGISTRY.find(({ id }) => id === toolId);
      expect(tool, toolId).toBeTruthy();
      expect(tool.seoTitle).toContain("FixThatPDF");
      expect(tool.metaDescription.length).toBeGreaterThan(100);
      expect(tool.metaDescription.length).toBeLessThanOrEqual(160);
      expect(tool.heroHeadline).not.toContain("honest limits");
      expect(tool.longDescription.length).toBeGreaterThan(180);
      expect(tool.steps).toHaveLength(3);
      expect(tool.verificationChecklist).toHaveLength(3);
      expect(tool.troubleshooting).toHaveLength(3);
      expect(tool.faqEntries).toHaveLength(5);
      expect(tool.privacySummary.length).toBeGreaterThan(80);
    }
  });

  it("only emits FAQ structured data where the complete FAQ is visible", () => {
    expect(toolSeoSchemas(TOOL_REGISTRY.find(({ id }) => id === "pdf-to-word")).map((schema) => schema["@type"])).toEqual(["BreadcrumbList", "HowTo", "FAQPage"]);
    expect(toolSeoSchemas(TOOL_REGISTRY.find(({ id }) => id === "rotate-pdf")).map((schema) => schema["@type"])).toEqual(["BreadcrumbList", "HowTo"]);
  });
});

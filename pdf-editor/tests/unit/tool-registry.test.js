import { describe, expect, it } from "vitest";
import { FOOTER_TOOL_GROUPS, getToolMenuGroups, MEGA_MENU_CATEGORY_IDS } from "../../src/tools/toolNavigation.js";
import { TOOL_CATEGORY_PAGES } from "../../src/tools/toolCategoryPages.js";
import { HIGH_INTENT_TOOL_IDS, PRIMARY_SEARCH_TOOL_IDS } from "../../src/tools/highIntentToolContent.js";
import { TOOL_CATEGORIES, TOOL_REGISTRY, validateToolRegistry } from "../../src/tools/toolRegistry.js";
import { toolSeoSchemas } from "../../src/tools/toolSeoSchemas.js";

const requiredFields = [
  "id", "slug", "route", "name", "shortDescription", "longDescription", "category", "categoryName",
  "icon", "accentColor", "status", "supportedInputTypes", "supportedOutputTypes", "uploadEnabled",
  "opensEditor", "workflowType", "currentLimitations", "availabilityLabel", "seoTitle", "metaDescription", "heroHeadline",
  "heroSubheadline", "benefits", "steps", "useCases", "faqEntries", "privacySummary", "verificationChecklist",
  "troubleshooting", "searchPriority", "searchRelatedTools", "relatedTools", "canonicalUrl", "schemaType",
];

describe("PDFEnrich tool registry", () => {
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

  it("gives every released tool crawlable links to other released tools", () => {
    const releasedIds = new Set(TOOL_REGISTRY.filter(({ status }) => status !== "coming-soon").map(({ id }) => id));
    for (const tool of TOOL_REGISTRY.filter(({ status }) => status !== "coming-soon")) {
      expect(tool.relatedTools.length, tool.id).toBeGreaterThan(0);
      expect(tool.relatedTools.every((id) => id !== tool.id && releasedIds.has(id)), tool.id).toBe(true);
    }
  });

  it("provides one unique indexable hub for every tool category", () => {
    expect(TOOL_CATEGORY_PAGES).toHaveLength(TOOL_CATEGORIES.length);
    expect(new Set(TOOL_CATEGORY_PAGES.map(({ route }) => route)).size).toBe(TOOL_CATEGORY_PAGES.length);
    expect(TOOL_CATEGORY_PAGES.every(({ seoTitle, metaDescription, guidance }) => seoTitle.includes("PDFEnrich") && metaDescription.length > 80 && guidance.length === 3)).toBe(true);
  });

  it("provides substantial, unique guidance for every researched high-intent tool", () => {
    expect(HIGH_INTENT_TOOL_IDS).toHaveLength(14);
    for (const toolId of HIGH_INTENT_TOOL_IDS) {
      const tool = TOOL_REGISTRY.find(({ id }) => id === toolId);
      expect(tool, toolId).toBeTruthy();
      expect(tool.seoTitle).toContain("PDFEnrich");
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
    const translate = TOOL_REGISTRY.find(({ id }) => id === "translate-pdf");
    expect(translate.steps.join(" ")).toContain("source");
    expect(translate.steps.join(" ")).toContain("target");
    expect(translate.verificationChecklist.join(" ")).toContain("does not preserve");
    expect(translate.faqEntries.some(({ answer }) => answer.includes("English as the target"))).toBe(true);
  });

  it("marks the ten primary search pages and gives them curated tool journeys", () => {
    expect(PRIMARY_SEARCH_TOOL_IDS).toHaveLength(10);
    expect(new Set(PRIMARY_SEARCH_TOOL_IDS).size).toBe(10);
    const priorityTools = TOOL_REGISTRY.filter(({ searchPriority }) => searchPriority);
    expect(priorityTools.map(({ id }) => id)).toEqual(expect.arrayContaining(PRIMARY_SEARCH_TOOL_IDS));
    expect(priorityTools).toHaveLength(10);
    expect(priorityTools.every(({ searchRelatedTools, relatedTools }) => searchRelatedTools.length === 3 && relatedTools.join("|") === searchRelatedTools.join("|"))).toBe(true);
  });

  it("links the first guide cluster back from its matching tools", () => {
    const guideLinks = Object.fromEntries(TOOL_REGISTRY.filter(({ supportGuide }) => supportGuide).map(({ id, supportGuide }) => [id, supportGuide.path]));
    expect(guideLinks).toMatchObject({
      "edit-pdf": "/guides/how-to-edit-a-pdf",
      "compress-pdf": "/guides/compress-pdf-without-losing-quality",
      "merge-pdf": "/guides/how-to-combine-pdf-files",
      "fill-pdf": "/guides/how-to-fill-and-sign-pdf",
      "sign-pdf": "/guides/how-to-fill-and-sign-pdf",
      "pdf-to-word": "/guides/pdf-to-word-formatting",
    });
  });

  it("adds truthful free WebApplication markup only to the ten primary search pages", () => {
    const prioritySchemas = toolSeoSchemas(TOOL_REGISTRY.find(({ id }) => id === "pdf-to-word"));
    expect(prioritySchemas.map((schema) => schema["@type"])).toEqual(["BreadcrumbList", "WebApplication"]);
    expect(prioritySchemas[1]).toMatchObject({
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    });
    expect(toolSeoSchemas(TOOL_REGISTRY.find(({ id }) => id === "rotate-pdf")).map((schema) => schema["@type"])).toEqual(["BreadcrumbList"]);
  });
});

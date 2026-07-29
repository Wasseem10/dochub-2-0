import { describe, expect, it } from "vitest";
import evidenceRecords from "../../config/priority-two-evidence.mjs";
import { priorityOneToolCoverage } from "../../config/priority-one-quality.mjs";
import { EDITORIAL_RESOURCE_PAGES } from "../../src/editorial/editorialResources.js";
import { EDITORIAL_RESOURCE_PATHS } from "../../src/editorial/editorialRoutePaths.js";
import { CORE_EDITORIAL_TOOL_IDS, getToolEvidence } from "../../src/editorial/toolEvidence.js";

describe("Priority 2 editorial evidence", () => {
  it("covers every released core workflow exactly once", () => {
    const priorityOneIds = priorityOneToolCoverage.map(({ toolId }) => toolId).sort();
    expect([...CORE_EDITORIAL_TOOL_IDS].sort()).toEqual(priorityOneIds);
    expect(evidenceRecords).toHaveLength(21);
    for (const toolId of priorityOneIds) {
      expect(getToolEvidence(toolId)).toMatchObject({ toolId });
    }
  });

  it("uses specific examples, measurements, methods, and accessible demo descriptions", () => {
    for (const record of evidenceRecords) {
      for (const field of ["input", "output", "result", "method", "demoAlt"]) {
        expect(record[field].trim().length).toBeGreaterThan(23);
      }
    }
  });
});

describe("original editorial resource inventory", () => {
  it("has one substantive record per resource route", () => {
    expect(EDITORIAL_RESOURCE_PAGES.map(({ path }) => path).sort()).toEqual([...EDITORIAL_RESOURCE_PATHS].sort());
    for (const page of EDITORIAL_RESOURCE_PAGES) {
      expect(page.sections.length).toBeGreaterThanOrEqual(3);
      expect(page.related.length).toBeGreaterThan(0);
      expect(page.reviewedIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(page.owner).toContain("Product Engineering");
    }
  });

  it("does not reuse titles, descriptions, or promises across search intents", () => {
    for (const field of ["title", "seoTitle", "metaDescription", "lede"]) {
      const values = EDITORIAL_RESOURCE_PAGES.map((page) => page[field]);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it("publishes five worked practical guides with direct tool actions", () => {
    const guides = EDITORIAL_RESOURCE_PAGES.filter(({ kind }) => kind === "guide");
    expect(guides).toHaveLength(5);
    for (const guide of guides) {
      expect(guide.path).toMatch(/^\/guides\//);
      expect(guide.publishedIso).toBe("2026-07-29");
      expect(guide.primaryAction.path).toMatch(/^\//);
      expect(guide.guideToolId).toBeTruthy();
      expect(guide.workedExample.result.length).toBeGreaterThan(50);
      expect(guide.sections).toHaveLength(5);
    }
  });

  it("publishes ten distinct long-tail guides and one reproducible attachment study", () => {
    const searchGuides = EDITORIAL_RESOURCE_PAGES.filter(({ kind }) => kind === "search-guide");
    expect(searchGuides).toHaveLength(10);
    for (const guide of searchGuides) {
      expect(guide.path).toMatch(/^\/guides\//);
      expect(guide.primaryAction.path).toMatch(/^\//);
      expect(guide.sections.length).toBeGreaterThanOrEqual(4);
      expect(guide.related.length).toBeGreaterThanOrEqual(3);
    }
    const study = EDITORIAL_RESOURCE_PAGES.find(({ id }) => id === "pdf-attachment-size-study");
    expect(study).toMatchObject({ kind: "study", path: "/research/pdf-email-attachment-size-study" });
    expect(study.downloads).toHaveLength(3);
    expect(study.sources[0][1]).toMatch(/^https:\/\//);
  });
});

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
});

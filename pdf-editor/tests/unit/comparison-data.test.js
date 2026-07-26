import { describe, expect, it } from "vitest";
import { COMPARISONS, COMPARISON_PATHS, comparisonPath, getComparisonBySlug } from "../../src/comparison/comparisonData.js";

describe("competitor comparison content", () => {
  it("publishes one sourced page per researched competitor", () => {
    expect(COMPARISONS.map(({ slug }) => slug)).toEqual([
      "dochub",
      "smallpdf",
      "ilovepdf",
      "adobe-acrobat",
      "sejda",
    ]);
    COMPARISONS.forEach((comparison) => {
      expect(comparison.rows.length).toBeGreaterThanOrEqual(6);
      expect(comparison.sources.length).toBeGreaterThanOrEqual(3);
      comparison.sources.forEach(([, href]) => expect(href).toMatch(/^https:\/\//));
    });
  });

  it("resolves canonical comparison paths", () => {
    expect(COMPARISON_PATHS).toContain("/compare");
    expect(comparisonPath("dochub")).toBe("/compare/pdfarrow-vs-dochub");
    expect(getComparisonBySlug("pdfarrow-vs-dochub")?.company).toBe("DocHub");
  });
});

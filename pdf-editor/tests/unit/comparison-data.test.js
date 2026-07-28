import { describe, expect, it } from "vitest";
import { COMPARISONS, COMPARISON_PATHS, comparisonAdvantageCards, comparisonFaqEntries, comparisonPath, comparisonPlanRows, getComparisonBySlug } from "../../src/comparison/comparisonData.js";

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
      expect(comparisonAdvantageCards(comparison)).toHaveLength(4);
      expect(comparisonPlanRows(comparison)).toHaveLength(3);
      expect(comparisonFaqEntries(comparison).length).toBeGreaterThanOrEqual(5);
      comparison.sources.forEach(([, href]) => expect(href).toMatch(/^https:\/\//));
    });
  });

  it("resolves canonical comparison paths", () => {
    expect(COMPARISON_PATHS).toContain("/compare");
    expect(comparisonPath("dochub")).toBe("/compare/pdfenrich-vs-dochub");
    expect(getComparisonBySlug("pdfenrich-vs-dochub")?.company).toBe("DocHub");
  });
});

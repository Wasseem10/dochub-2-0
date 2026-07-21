import { describe, expect, it } from "vitest";
import { buildPdfSanitizeArgs } from "../../src/tools/pdfExportSanitizer.js";

describe("replaced PDF cleanup", () => {
  it("rewrites reachable objects and removes abandoned page resources", () => {
    expect(buildPdfSanitizeArgs()).toEqual([
      "--object-streams=generate",
      "--recompress-flate",
      "--remove-unreferenced-resources=yes",
      "--",
      "edited.pdf",
      "sanitized.pdf",
    ]);
  });
});

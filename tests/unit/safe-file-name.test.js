import { describe, expect, it } from "vitest";
import { sanitizePdfDisplayName } from "../../src/tools/safeFileName.js";

describe("PDF filename sanitization", () => {
  it("removes control characters, paths, bidi overrides, and header punctuation", () => {
    expect(sanitizePdfDisplayName("../invo\r\nice\u202e<script>.pdf")).toBe("invoice-script-.pdf");
    expect(sanitizePdfDisplayName("C:\\private\\report.pdf")).toBe("C-private-report.pdf");
  });

  it("adds a safe extension, bounds length, and has a non-empty fallback", () => {
    expect(sanitizePdfDisplayName("Quarterly report")).toBe("Quarterly report.pdf");
    expect(sanitizePdfDisplayName("")).toBe("Untitled document.pdf");
    expect(sanitizePdfDisplayName("a".repeat(300)).length).toBeLessThanOrEqual(124);
  });
});

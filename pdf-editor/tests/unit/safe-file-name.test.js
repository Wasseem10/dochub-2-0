import { describe, expect, it } from "vitest";
import {
  downloadFileNameForMime,
  sanitizeDownloadFileName,
  sanitizePdfDisplayName,
} from "../../src/tools/safeFileName.js";

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

describe("download filename sanitization", () => {
  it.each([
    ["Contract.pdf", "Contract.pdf"],
    ["Contract.png", "Contract.png"],
    ["Contract.jpg", "Contract.jpg"],
    ["Contract-page-images.zip", "Contract-page-images.zip"],
    ["Contract.docx", "Contract.docx"],
    ["Contract.xlsx", "Contract.xlsx"],
    ["Contract.pptx", "Contract.pptx"],
  ])("preserves the supported extension for %s", (value, expected) => {
    expect(sanitizeDownloadFileName(value)).toBe(expected);
  });

  it("removes control characters, paths, and bidirectional overrides", () => {
    expect(sanitizeDownloadFileName("../invo\r\nice\u202e<script>.docx")).toBe("invoice-script-.docx");
  });

  it("does not let an unknown extension become an executable download", () => {
    expect(sanitizeDownloadFileName("invoice.exe")).toBe("invoice.pdf");
  });

  it("keeps the real extension when truncating long names", () => {
    const name = sanitizeDownloadFileName(`${"a".repeat(300)}.pptx`);
    expect(name.length).toBeLessThanOrEqual(124);
    expect(name.endsWith(".pptx")).toBe(true);
  });

  it.each([
    ["Resume_Wasseem.png.pdf", "image/png", "Resume_Wasseem.png"],
    ["Resume_Wasseem.jpg.pdf", "image/jpeg", "Resume_Wasseem.jpg"],
    ["Resume_Wasseem.png", "application/pdf", "Resume_Wasseem.pdf"],
    ["Resume_Wasseem.pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Resume_Wasseem.docx"],
    ["Resume_Wasseem.pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Resume_Wasseem.xlsx"],
    ["Resume_Wasseem.pdf", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "Resume_Wasseem.pptx"],
  ])("matches %s to its real %s file type", (value, mimeType, expected) => {
    expect(downloadFileNameForMime(value, mimeType)).toBe(expected);
  });
});

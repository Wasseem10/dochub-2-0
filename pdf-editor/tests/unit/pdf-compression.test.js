import { describe, expect, it } from "vitest";
import { buildStructurePreservingCompressionArgs, createCompressedPdfFromJpegs } from "../../src/tools/pdfCompression.js";

describe("PDF compression primitive", () => {
  it("requires rendered JPEG pages", async () => {
    await expect(createCompressedPdfFromJpegs([])).rejects.toThrow("No rendered pages");
    await expect(createCompressedPdfFromJpegs([{ width: 612, height: 792, jpegBytes: new Uint8Array() }])).rejects.toThrow("invalid");
  });

  it("builds lossless and image-optimized structure-preserving profiles", () => {
    const lossless = buildStructurePreservingCompressionArgs("lossless");
    expect(lossless).toContain("--object-streams=generate");
    expect(lossless).toContain("--recompress-flate");
    expect(lossless).not.toContain("--optimize-images");
    expect(buildStructurePreservingCompressionArgs("balanced")).toContain("--optimize-images");
    expect(() => buildStructurePreservingCompressionArgs("unknown")).toThrow("supported");
  });
});

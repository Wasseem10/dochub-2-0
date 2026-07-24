import { describe, expect, it } from "vitest";
import {
  buildStructurePreservingCompressionArgs,
  compressionSavings,
  createCompressedPdfFromJpegs,
  PDF_COMPRESSION_PRESETS,
} from "../../src/tools/pdfCompression.js";

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

  it("publishes honest preset impact and measured savings", () => {
    expect(PDF_COMPRESSION_PRESETS.maximum.structurePreserving).toBe(false);
    expect(PDF_COMPRESSION_PRESETS.lossless.impact).toMatch(/No intentional/);
    expect(compressionSavings(1_000, 625)).toMatchObject({
      savedBytes: 375,
      savedPercent: 37.5,
      smaller: true,
    });
    expect(compressionSavings(1_000, 1_100).smaller).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { createCompressedPdfFromJpegs } from "../../src/tools/pdfCompression.js";

describe("PDF compression primitive", () => {
  it("requires rendered JPEG pages", async () => {
    await expect(createCompressedPdfFromJpegs([])).rejects.toThrow("No rendered pages");
    await expect(createCompressedPdfFromJpegs([{ width: 612, height: 792, jpegBytes: new Uint8Array() }])).rejects.toThrow("invalid");
  });
});

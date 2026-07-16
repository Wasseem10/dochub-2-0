import { describe, expect, it } from "vitest";
import { buildProtectPdfArgs } from "../../src/tools/protectPdf.js";

describe("PDF password protection", () => {
  it("uses AES-256 qpdf encryption and keeps passwords as single arguments", () => {
    expect(buildProtectPdfArgs("user password", "owner password")).toEqual([
      "--encrypt", "user password", "owner password", "256", "--", "input.pdf", "protected.pdf",
    ]);
  });
});

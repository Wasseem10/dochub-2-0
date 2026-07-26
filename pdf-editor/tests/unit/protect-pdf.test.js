import { describe, expect, it } from "vitest";
import { buildProtectPdfArgs, buildUnlockPdfArgs, formatQpdfProtectionError } from "../../src/tools/protectPdf.js";

describe("PDF password protection", () => {
  it("uses AES-256 qpdf encryption and keeps passwords as single arguments", () => {
    expect(buildProtectPdfArgs("user password", "owner password")).toEqual([
      "--encrypt", "user password", "owner password", "256", "--", "input.pdf", "protected.pdf",
    ]);
  });

  it("passes the known password to qpdf and decrypts the output", () => {
    expect(buildUnlockPdfArgs("current password")).toEqual([
      "--password=current password", "--decrypt", "--", "input.pdf", "unlocked.pdf",
    ]);
  });

  it("turns worker startup timeouts into actionable retry guidance", () => {
    const timeout = { code: "QPDF_TIMEOUT", message: "QPDF worker timed out." };
    expect(formatQpdfProtectionError(timeout, "unlock")).toBe(
      "Password removal took too long in this browser. Close other PDFArrow tabs and try again.",
    );
    expect(formatQpdfProtectionError(timeout, "protect")).toBe(
      "Password protection took too long in this browser. Close other PDFArrow tabs and try again.",
    );
  });

  it("keeps incorrect-password guidance specific", () => {
    expect(formatQpdfProtectionError({ stderr: ["invalid password"] }, "unlock")).toBe(
      "That password did not unlock this PDF. Check it and try again.",
    );
  });
});

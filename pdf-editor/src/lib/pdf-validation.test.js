import { describe, expect, it } from "vitest";
import { classifyPdfOpenError, PDF_ERROR_CODES, validatePdfCandidate } from "./pdf-validation.js";

function makeFile(content, { name = "document.pdf", type = "application/pdf", size } = {}) {
  const blob = new Blob([content], { type });
  Object.defineProperty(blob, "name", { value: name });
  if (size !== undefined) Object.defineProperty(blob, "size", { value: size });
  return blob;
}

describe("validatePdfCandidate", () => {
  it("accepts a PDF signature even when metadata is sparse", async () => {
    const result = await validatePdfCandidate(makeFile("%PDF-1.7\n%%EOF"));
    expect(result).toEqual({ ok: true });
  });

  it.each([
    [null, PDF_ERROR_CODES.MISSING],
    [makeFile("", {}), PDF_ERROR_CODES.EMPTY],
    [makeFile("plain text", { name: "notes.txt", type: "text/plain" }), PDF_ERROR_CODES.TYPE],
    [makeFile("not really a pdf"), PDF_ERROR_CODES.INVALID_SIGNATURE],
    [makeFile("%PDF-1.7", { size: 9 * 1024 * 1024 }), PDF_ERROR_CODES.OVERSIZED],
  ])("returns a stable error code", async (file, expectedCode) => {
    const result = await validatePdfCandidate(file);
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe(expectedCode);
    expect(result.error.message.length).toBeGreaterThan(10);
  });
});

describe("classifyPdfOpenError", () => {
  it("distinguishes password-protected PDFs", () => {
    expect(classifyPdfOpenError({ name: "PasswordException" }).code).toBe(PDF_ERROR_CODES.ENCRYPTED);
  });

  it("distinguishes corrupt PDFs", () => {
    expect(classifyPdfOpenError({ name: "InvalidPDFException" }).code).toBe(PDF_ERROR_CODES.CORRUPTED);
  });
});

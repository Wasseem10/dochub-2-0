import { describe, expect, it } from "vitest";
import { getPdfLoadErrorMessage, MAX_PDF_UPLOAD_BYTES, validatePdfUpload } from "../../src/tools/pdfUploadValidation.js";

describe("PDF upload validation", () => {
  it("accepts normal PDFs and rejects wrong, empty, and oversized files", () => {
    expect(validatePdfUpload({ name: "contract.pdf", type: "application/pdf", size: 1024 })).toBe("");
    expect(validatePdfUpload({ name: "image.png", type: "image/png", size: 1024 })).toContain("Choose a PDF");
    expect(validatePdfUpload({ name: "empty.pdf", type: "application/pdf", size: 0 })).toContain("empty");
    expect(validatePdfUpload({ name: "large.pdf", type: "application/pdf", size: MAX_PDF_UPLOAD_BYTES + 1 })).toContain("smaller than 8 MB");
  });

  it("returns actionable encrypted and corrupted PDF errors", () => {
    expect(getPdfLoadErrorMessage({ name: "PasswordException" })).toContain("password-protected");
    expect(getPdfLoadErrorMessage({ name: "InvalidPDFException" })).toContain("corrupted or invalid");
    expect(getPdfLoadErrorMessage(new Error("unknown"))).toContain("valid, unencrypted");
  });
});

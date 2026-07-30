import { describe, expect, it } from "vitest";
import {
  getPdfLoadErrorMessage,
  MAX_PDF_EDITOR_PAGES,
  MAX_PDF_UPLOAD_BYTES,
  validatePdfFileContent,
  validatePdfUpload,
} from "../../src/tools/pdfUploadValidation.js";

describe("PDF upload validation", () => {
  it("accepts normal PDFs and rejects wrong, empty, and oversized files", () => {
    expect(validatePdfUpload({ name: "contract.pdf", type: "application/pdf", size: 1024 })).toBe("");
    expect(validatePdfUpload({ name: "image.png", type: "image/png", size: 1024 })).toContain("Choose a PDF");
    expect(validatePdfUpload({ name: "disguised.pdf", type: "text/html", size: 1024 })).toContain("not declared");
    expect(validatePdfUpload({ name: "contract", type: "application/pdf", size: 1024 })).toContain(".pdf extension");
    expect(validatePdfUpload({ name: "empty.pdf", type: "application/pdf", size: 0 })).toContain("empty");
    expect(validatePdfUpload({ name: "large.pdf", type: "application/pdf", size: MAX_PDF_UPLOAD_BYTES + 1 })).toContain("smaller than 50 MB");
    expect(MAX_PDF_EDITOR_PAGES).toBe(500);
  });

  it("checks PDF magic bytes and a clean EOF marker before parsing", async () => {
    const valid = new File(["%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n"], "valid.pdf", { type: "application/pdf" });
    const html = new File(["<!doctype html><script>alert(1)</script>"], "invoice.pdf", { type: "application/pdf" });
    const executable = new File(["MZ-not-a-pdf"], "installer.pdf", { type: "application/pdf" });
    const trailing = new File(["%PDF-1.7\n%%EOF\n<script>"], "polyglot.pdf", { type: "application/pdf" });

    await expect(validatePdfFileContent(valid)).resolves.toBe("");
    await expect(validatePdfFileContent(html)).resolves.toContain("HTML file disguised");
    await expect(validatePdfFileContent(executable)).resolves.toContain("executable");
    await expect(validatePdfFileContent(trailing)).resolves.toContain("unexpected data");
  });

  it("rejects active PDF content the browser editor does not execute", async () => {
    const scripted = new File(["%PDF-1.7\n1 0 obj\n<</JavaScript 2 0 R>>\nendobj\n%%EOF"], "scripted.pdf", {
      type: "application/pdf",
    });
    await expect(validatePdfFileContent(scripted)).resolves.toContain("scripts");
  });

  it("returns actionable encrypted and corrupted PDF errors", () => {
    expect(getPdfLoadErrorMessage({ name: "PasswordException" })).toContain("password-protected");
    expect(getPdfLoadErrorMessage({ name: "InvalidPDFException" })).toContain("corrupted or invalid");
    expect(getPdfLoadErrorMessage(new Error("unknown"))).toContain("valid, unencrypted");
  });
});

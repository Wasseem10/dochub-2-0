import { describe, expect, it } from "vitest";
import {
  LANDING_DOCUMENT_ACCEPT,
  resolveLandingDocumentTool,
} from "../../src/tools/landingDocumentUpload.js";
import {
  setPendingDocumentFile,
  setPendingPdfFile,
  takePendingDocumentFile,
  takePendingPdfFile,
} from "../../src/tools/pendingPdfFile.js";

describe("landing document upload routing", () => {
  it.each([
    ["report.pdf", "application/pdf", "edit-pdf", "/edit-pdf"],
    ["proposal.DOCX", "", "word-to-pdf", "/word-to-pdf"],
    ["budget.xlsx", "", "excel-to-pdf", "/excel-to-pdf"],
    ["deck.pptx", "", "powerpoint-to-pdf", "/powerpoint-to-pdf"],
    ["notes.txt", "", "txt-to-pdf", "/txt-to-pdf"],
    ["draft.odt", "", "odt-to-pdf", "/odt-to-pdf"],
    ["photo.jpeg", "", "jpg-to-pdf", "/jpg-to-pdf"],
    ["scan.png", "", "png-to-pdf", "/png-to-pdf"],
  ])("routes %s to its browser workflow", (name, type, toolId, route) => {
    expect(resolveLandingDocumentTool({ name, type })).toEqual({ toolId, route });
  });

  it("uses a known MIME type when the file name has no extension", () => {
    expect(resolveLandingDocumentTool({ name: "untitled", type: "text/html" })).toEqual({
      toolId: "html-to-pdf",
      route: "/html-to-pdf",
    });
  });

  it("rejects unsupported files instead of sending them to the PDF editor", () => {
    expect(resolveLandingDocumentTool({ name: "animation.gif", type: "image/gif" })).toBeNull();
    expect(LANDING_DOCUMENT_ACCEPT).not.toContain(".gif");
  });

  it("hands a pending file only to its intended workflow", () => {
    const spreadsheet = { name: "budget.xlsx" };
    setPendingDocumentFile(spreadsheet, "excel-to-pdf");
    expect(takePendingDocumentFile("word-to-pdf")).toBeNull();
    expect(takePendingDocumentFile("excel-to-pdf")).toBe(spreadsheet);
    expect(takePendingDocumentFile("excel-to-pdf")).toBeNull();

    const pdf = { name: "contract.pdf" };
    setPendingPdfFile(pdf);
    expect(takePendingPdfFile()).toBe(pdf);
  });
});

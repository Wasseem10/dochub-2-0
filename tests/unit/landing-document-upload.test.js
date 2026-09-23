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
    ["proposal.DOCX", "", "edit-pdf", "/edit-pdf"],
    ["budget.xlsx", "", "edit-pdf", "/edit-pdf"],
    ["deck.pptx", "", "edit-pdf", "/edit-pdf"],
    ["notes.txt", "", "edit-pdf", "/edit-pdf"],
    ["draft.odt", "", "edit-pdf", "/edit-pdf"],
    ["photo.jpeg", "", "edit-pdf", "/edit-pdf"],
    ["scan.png", "", "edit-pdf", "/edit-pdf"],
  ])("routes %s into the editor", (name, type, toolId, route) => {
    expect(resolveLandingDocumentTool({ name, type })).toEqual({ toolId, route });
  });

  it("uses a known MIME type when the file name has no extension", () => {
    expect(resolveLandingDocumentTool({ name: "untitled", type: "text/html" })).toEqual({
      toolId: "edit-pdf",
      route: "/edit-pdf",
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

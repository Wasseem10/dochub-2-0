import { describe, expect, it } from "vitest";
import {
  legacyCloudPayloadPath,
  normalizeLegacyCloudMetadata,
  normalizeLegacyCloudPayload,
} from "../../src/cloud/legacyCloudDocumentMigration.js";

describe("older cloud document migration boundary", () => {
  it("derives the only accepted legacy path from the authenticated owner and record id", () => {
    expect(legacyCloudPayloadPath("firebase-user", "doc_123")).toBe(
      "users/firebase-user/documents/doc_123/document.json",
    );
    expect(() => legacyCloudPayloadPath("firebase-user", "../other-user")).toThrow();
    expect(() => legacyCloudPayloadPath("other/user", "doc_123")).toThrow();
  });

  it("rejects metadata whose owner or object path was changed", () => {
    const valid = {
      ownerId: "user-a",
      payloadPath: "users/user-a/documents/doc_123/document.json",
      name: "Report.pdf",
      pageCount: 2,
    };
    expect(normalizeLegacyCloudMetadata("user-a", "doc_123", valid)).toMatchObject({
      ownerId: "user-a",
      legacyCloudDocumentId: "doc_123",
      cloudOnly: true,
    });
    expect(normalizeLegacyCloudMetadata("user-b", "doc_123", valid)).toBeNull();
    expect(normalizeLegacyCloudMetadata("user-a", "doc_123", {
      ...valid,
      payloadPath: "users/user-b/documents/doc_123/document.json",
    })).toBeNull();
  });

  it("strictly normalizes a legacy PDF workspace before it reaches editor state", () => {
    const pdfDataUrl = `data:application/pdf;base64,${btoa("%PDF-1.7\n%%EOF")}`;
    const record = normalizeLegacyCloudPayload({
      userId: "user-a",
      documentId: "doc_123",
      expectedPath: "users/user-a/documents/doc_123/document.json",
      payload: {
        id: "doc_123",
        cloudPayloadPath: "users/user-a/documents/doc_123/document.json",
        name: "../../Quarterly\r\nReport",
        source: "pdf",
        pageCount: 1,
        pdfDataUrl,
        pages: [{ id: "page-1", source: "pdf", width: 612, height: 792 }],
        annotations: [
          { id: "link-1", type: "link", page: 0, url: "javascript:alert(1)" },
          { id: "unknown", type: "script", page: 0, content: "drop me" },
        ],
        detectedTextItems: [{ id: "text-1", pageNumber: 0, currentText: "Safe text" }],
      },
    });

    expect(record).toMatchObject({
      ownerId: "user-a",
      name: "QuarterlyReport.pdf",
      pageCount: 1,
      size: 14,
    });
    expect(record.annotations).toHaveLength(1);
    expect(record.annotations[0].url).toBe("");
  });

  it("rejects disguised PDF data and mismatched legacy routing", () => {
    const base = {
      id: "doc_123",
      source: "pdf",
      pageCount: 1,
      pages: [{ id: "page-1", source: "pdf" }],
      pdfDataUrl: `data:application/pdf;base64,${btoa("<html>not pdf</html>")}`,
    };
    expect(() => normalizeLegacyCloudPayload({
      payload: base,
      userId: "user-a",
      documentId: "doc_123",
      expectedPath: "users/user-a/documents/doc_123/document.json",
    })).toThrow(/signature validation/i);
    expect(() => normalizeLegacyCloudPayload({
      payload: {
        ...base,
        pdfDataUrl: `data:application/pdf;base64,${btoa("%PDF-1.7\n%%EOF")}`,
        cloudPayloadPath: "users/user-b/documents/doc_123/document.json",
      },
      userId: "user-a",
      documentId: "doc_123",
      expectedPath: "users/user-a/documents/doc_123/document.json",
    })).toThrow(/path is invalid/i);
  });
});

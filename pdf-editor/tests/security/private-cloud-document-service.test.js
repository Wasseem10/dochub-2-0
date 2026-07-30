import { describe, expect, it } from "vitest";
import {
  assertChecksum,
  assertStorageQuota,
  contentDispositionForPdf,
  createInternalId,
  createUploadPlan,
  inspectPdfBytes,
  isInternalDocumentId,
  isRecentAuthentication,
  privateVersionStorageKey,
  PrivateCloudSecurityError,
  sanitizePdfDisplayName,
  sha256Hex,
  uploadIntentKey,
  validateBeginUploadInput,
} from "../../functions/src/security/privateCloudDocumentService.js";

const mib = 1024 * 1024;
const validPdf = (extra = "") => new TextEncoder().encode(
  `%PDF-1.7\n1 0 obj\n<< /Type /Catalog ${extra} >>\nendobj\nstartxref\n0\n%%EOF\n`,
);

function deterministicRandom(value) {
  return (size) => new Uint8Array(size).fill(value);
}

describe("private cloud identifiers and paths", () => {
  it("uses server-side cryptographic entropy and fixed-shape internal IDs", () => {
    const documentId = createInternalId("doc", deterministicRandom(3));
    const versionId = createInternalId("ver", deterministicRandom(7));
    expect(documentId).toBe("doc_AwMDAwMDAwMDAwMDAwMDAwMD");
    expect(versionId).toBe("ver_BwcHBwcHBwcHBwcHBwcHBwcH");
    expect(isInternalDocumentId(documentId, "doc")).toBe(true);
    expect(isInternalDocumentId(versionId, "ver")).toBe(true);
    expect(isInternalDocumentId("doc-user-supplied", "doc")).toBe(false);
  });

  it("derives the object key only from verified identity and internal IDs", () => {
    const documentId = createInternalId("doc", deterministicRandom(3));
    const versionId = createInternalId("ver", deterministicRandom(7));
    expect(privateVersionStorageKey("verified-user@example.com", documentId, versionId)).toBe(
      `users/verified-user%40example.com/documents/${documentId}/versions/${versionId}.pdf`,
    );
    expect(() => privateVersionStorageKey("verified/user", documentId, versionId)).toThrow(
      expect.objectContaining({ code: "invalid_authenticated_user" }),
    );
    expect(() => privateVersionStorageKey("verified-user", "someone-elses-path", versionId)).toThrow(
      expect.objectContaining({ code: "invalid_internal_path" }),
    );
  });

  it("never accepts client owner, version, or storage routing fields", () => {
    const base = {
      fileName: "report.pdf",
      sizeBytes: 100,
      contentType: "application/pdf",
      checksumSha256: "a".repeat(64),
      idempotencyKey: "retry-key-123456",
    };
    for (const field of ["ownerId", "userId", "versionId", "storageKey", "storagePath", "path"]) {
      expect(() => validateBeginUploadInput({ ...base, [field]: "attacker-value" })).toThrow(
        expect.objectContaining({ code: "client_routing_field_forbidden" }),
      );
    }
  });
});

describe("private cloud upload metadata validation", () => {
  it("normalizes display-only filenames without using them in object paths", () => {
    expect(sanitizePdfDisplayName("../../Payroll\r\nX-Injected: yes")).toBe(
      "Payroll X-Injected- yes.pdf",
    );
    expect(sanitizePdfDisplayName("  résumé.PDF  ")).toBe("résumé.PDF");
  });

  it("requires exact PDF MIME, bounded integer size, and an idempotency key", () => {
    const valid = {
      fileName: "Quarterly results.pdf",
      sizeBytes: 2 * mib,
      contentType: "application/pdf",
      checksumSha256: "a".repeat(64),
      idempotencyKey: "upload-attempt-0001",
    };
    expect(validateBeginUploadInput(valid)).toMatchObject({
      displayName: "Quarterly results.pdf",
      declaredSize: 2 * mib,
      contentType: "application/pdf",
      expectedSha256: "a".repeat(64),
    });
    expect(() => validateBeginUploadInput({ ...valid, contentType: "text/html" })).toThrow(
      expect.objectContaining({ code: "invalid_content_type", status: 415 }),
    );
    expect(() => validateBeginUploadInput({ ...valid, sizeBytes: 1.5 })).toThrow(
      expect.objectContaining({ code: "invalid_size" }),
    );
    expect(() => validateBeginUploadInput({ ...valid, sizeBytes: 51 * mib })).toThrow(
      expect.objectContaining({ code: "file_size_not_allowed", status: 413 }),
    );
    expect(() => validateBeginUploadInput({ ...valid, fileName: "not-a-pdf.txt" })).toThrow(
      expect.objectContaining({ code: "invalid_file_extension", status: 415 }),
    );
    expect(() => validateBeginUploadInput({ ...valid, checksumSha256: "not-a-checksum" })).toThrow(
      expect.objectContaining({ code: "invalid_checksum" }),
    );
    expect(() => validateBeginUploadInput({ ...valid, idempotencyKey: "short" })).toThrow(
      expect.objectContaining({ code: "invalid_idempotency_key" }),
    );
  });

  it("hashes retry keys with the verified user so accounts cannot collide", () => {
    expect(uploadIntentKey("user-a", "same-retry-key-123")).not.toBe(
      uploadIntentKey("user-b", "same-retry-key-123"),
    );
    expect(uploadIntentKey("user-a", "same-retry-key-123")).toHaveLength(64);
  });
});

describe("PDF byte validation and integrity", () => {
  it("accepts a bounded PDF envelope and calculates SHA-256", () => {
    const bytes = validPdf();
    const result = inspectPdfBytes(bytes);
    expect(result).toEqual({
      byteLength: bytes.byteLength,
      sha256: sha256Hex(bytes),
      header: "%PDF-1.7",
    });
    expect(() => assertChecksum(result.sha256, result.sha256)).not.toThrow();
  });

  it("rejects extension/MIME spoof payloads and incomplete PDFs by magic bytes", () => {
    expect(() => inspectPdfBytes(new TextEncoder().encode("<html>not a PDF</html>"))).toThrow(
      expect.objectContaining({ code: "invalid_pdf_magic", status: 415 }),
    );
    expect(() => inspectPdfBytes(new TextEncoder().encode("%PDF-1.7\nnot finished"))).toThrow(
      expect.objectContaining({ code: "missing_pdf_eof" }),
    );
  });

  it("rejects unsupported encrypted PDFs before persistence", () => {
    expect(() => inspectPdfBytes(validPdf("/Encrypt 4 0 R"))).toThrow(
      expect.objectContaining({ code: "encrypted_pdf_not_supported", status: 422 }),
    );
  });

  it("rejects empty and oversized payloads before deeper parsing", () => {
    expect(() => inspectPdfBytes(new Uint8Array())).toThrow(
      expect.objectContaining({ code: "empty_pdf" }),
    );
    expect(() => inspectPdfBytes(validPdf(" ".repeat(256)), { maximumFileBytes: 128 })).toThrow(
      expect.objectContaining({ code: "file_size_not_allowed", status: 413 }),
    );
  });

  it("rejects polyglot-style trailing payloads", () => {
    const bytes = new TextEncoder().encode(
      "%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n<script>alert(1)</script>",
    );
    expect(() => inspectPdfBytes(bytes)).toThrow(
      expect.objectContaining({ code: "pdf_trailing_payload" }),
    );
  });

  it.each([
    ["/JavaScript", "pdf_javascript"],
    ["/OpenAction", "pdf_open_action"],
    ["/Launch", "pdf_launch_action"],
    ["/EmbeddedFile", "pdf_embedded_file"],
    ["/RichMedia", "pdf_rich_media"],
    ["/SubmitForm", "pdf_remote_action"],
  ])("rejects unsupported active PDF feature %s", (feature, expectedCode) => {
    expect(() => inspectPdfBytes(validPdf(feature))).toThrow(
      expect.objectContaining({ code: expectedCode }),
    );
  });

  it("uses constant-time checksum verification semantics", () => {
    const checksum = sha256Hex(validPdf());
    const different = `${checksum.slice(0, 63)}${checksum.endsWith("0") ? "1" : "0"}`;
    expect(() => assertChecksum(checksum, different)).toThrow(
      expect.objectContaining({ code: "checksum_mismatch" }),
    );
    expect(() => assertChecksum("not-a-checksum", checksum)).toThrow(
      expect.objectContaining({ code: "checksum_mismatch" }),
    );
  });
});

describe("quota, upload planning, and sensitive actions", () => {
  it("counts active and in-flight bytes before reserving an upload", () => {
    expect(() => assertStorageQuota({
      usage: { activeBytes: 70 * mib, reservedBytes: 20 * mib, documentCount: 2 },
      declaredSize: 11 * mib,
      createsDocument: true,
      maximumAccountBytes: 100 * mib,
    })).toThrow(expect.objectContaining({ code: "account_quota_exceeded" }));
    expect(assertStorageQuota({
      usage: { activeBytes: 70 * mib, reservedBytes: 10 * mib, documentCount: 2 },
      declaredSize: 20 * mib,
      createsDocument: false,
      maximumAccountBytes: 100 * mib,
    })).toBe(true);
  });

  it("rejects document and version count exhaustion", () => {
    expect(() => assertStorageQuota({
      usage: { documentCount: 2_000 },
      declaredSize: 1,
      createsDocument: true,
      maximumAccountBytes: 1_000,
    })).toThrow(expect.objectContaining({ code: "document_quota_exceeded" }));
    expect(() => assertStorageQuota({
      usage: {},
      declaredSize: 1,
      createsDocument: false,
      existingVersionCount: 100,
      maximumAccountBytes: 1_000,
    })).toThrow(expect.objectContaining({ code: "version_quota_exceeded" }));
  });

  it("creates an owner-derived version plan without client path input", () => {
    let invocation = 0;
    const random = (size) => new Uint8Array(size).fill(++invocation);
    const input = validateBeginUploadInput({
      fileName: "Statements.pdf",
      sizeBytes: 1_024,
      contentType: "application/pdf",
      checksumSha256: "b".repeat(64),
      idempotencyKey: "upload-attempt-0002",
    });
    const plan = createUploadPlan({
      verifiedUserId: "firebase-user-1",
      validatedInput: input,
      usage: {},
      maximumAccountBytes: 10 * mib,
      now: new Date("2026-07-29T12:00:00.000Z"),
      randomBytes: random,
    });
    expect(plan.documentId).toMatch(/^doc_/);
    expect(plan.versionId).toMatch(/^ver_/);
    expect(plan.storageKey).toBe(
      `users/firebase-user-1/documents/${plan.documentId}/versions/${plan.versionId}.pdf`,
    );
    expect(plan).not.toHaveProperty("ownerId", input.documentId);
    expect(plan.expiresAt).toBe("2026-07-30T12:00:00.000Z");
  });

  it("requires a recent verified authentication time for account purge", () => {
    const now = new Date("2026-07-29T12:00:00.000Z");
    expect(isRecentAuthentication(now.getTime() / 1_000 - 120, { now })).toBe(true);
    expect(isRecentAuthentication(now.getTime() / 1_000 - 301, { now })).toBe(false);
    expect(isRecentAuthentication(0, { now })).toBe(false);
  });

  it("builds a download header without control-character injection", () => {
    const disposition = contentDispositionForPdf("report\r\nSet-Cookie: stolen=1.pdf");
    expect(disposition).toContain("attachment;");
    expect(disposition).not.toMatch(/[\r\n]/);
    expect(disposition).toContain("filename*=UTF-8''");
  });
});

describe("security errors", () => {
  it("exposes stable codes and HTTP status without embedding payload data", () => {
    const error = new PrivateCloudSecurityError("document_not_found", "Unavailable.", 404);
    expect(error).toMatchObject({
      name: "PrivateCloudSecurityError",
      code: "document_not_found",
      status: 404,
      message: "Unavailable.",
    });
  });
});

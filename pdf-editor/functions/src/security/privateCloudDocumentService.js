import { createHash, randomBytes as nodeRandomBytes, timingSafeEqual } from "node:crypto";

export const PRIVATE_CLOUD_SECURITY_LIMITS = Object.freeze({
  hardMaxPdfBytes: 50 * 1024 * 1024,
  maximumDocumentsPerAccount: 2_000,
  maximumVersionsPerDocument: 100,
  uploadIntentLifetimeMs: 24 * 60 * 60 * 1_000,
  recentAuthenticationSeconds: 5 * 60,
});

export class PrivateCloudSecurityError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "PrivateCloudSecurityError";
    this.code = code;
    this.status = status;
  }
}

const INTERNAL_ID_PATTERN = /^(doc|ver)_[A-Za-z0-9_-]{24}$/;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const PDF_MIME = "application/pdf";
const PDF_HEADER_PATTERN = /^%PDF-(?:1\.[0-9]|2\.0)/;
const FORBIDDEN_PDF_FEATURES = Object.freeze([
  { code: "encrypted_pdf_not_supported", pattern: /\/Encrypt\b/i },
  { code: "pdf_javascript", pattern: /\/(?:JavaScript|JS)\b/i },
  { code: "pdf_open_action", pattern: /\/OpenAction\b/i },
  { code: "pdf_launch_action", pattern: /\/Launch\b/i },
  { code: "pdf_embedded_file", pattern: /\/(?:EmbeddedFiles?|FileAttachment)\b/i },
  { code: "pdf_rich_media", pattern: /\/(?:RichMedia|Movie|Sound)\b/i },
  { code: "pdf_remote_action", pattern: /\/(?:GoToR|SubmitForm|ImportData)\b/i },
]);

function bytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  throw new PrivateCloudSecurityError("invalid_bytes", "A binary PDF payload is required.");
}

function safeInteger(value, code, message) {
  if (!Number.isSafeInteger(value)) throw new PrivateCloudSecurityError(code, message);
  return value;
}

function constantTimeTextEqual(left, right) {
  const leftBytes = Buffer.from(String(left));
  const rightBytes = Buffer.from(String(right));
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function replaceAsciiControls(value, replacement = " ") {
  return Array.from(String(value || ""), (character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127 ? replacement : character;
  }).join("");
}

export function createInternalId(prefix, randomBytes = nodeRandomBytes) {
  if (prefix !== "doc" && prefix !== "ver") {
    throw new PrivateCloudSecurityError("invalid_id_prefix", "An internal document or version prefix is required.");
  }
  const entropy = randomBytes(18);
  if (!(entropy instanceof Uint8Array) || entropy.byteLength !== 18) {
    throw new PrivateCloudSecurityError("invalid_random_source", "The secure random source returned invalid entropy.", 500);
  }
  return `${prefix}_${Buffer.from(entropy).toString("base64url")}`;
}

export function isInternalDocumentId(value, prefix) {
  const text = String(value || "");
  return INTERNAL_ID_PATTERN.test(text) && (!prefix || text.startsWith(`${prefix}_`));
}

export function sanitizePdfDisplayName(value) {
  const leafName = String(value || "document.pdf").split(/[\\/]/).at(-1) || "document.pdf";
  const normalized = replaceAsciiControls(leafName)
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, 160);
  const baseName = normalized || "document.pdf";
  return /\.pdf$/i.test(baseName) ? baseName : `${baseName.slice(0, 156)}.pdf`;
}

export function encodeVerifiedUserId(userId) {
  const value = String(userId || "");
  if (
    !/^[A-Za-z0-9._~:@+=-]{1,128}$/.test(value)
    || value === "."
    || value === ".."
  ) {
    throw new PrivateCloudSecurityError("invalid_authenticated_user", "The verified account identifier is invalid.", 401);
  }
  return encodeURIComponent(value);
}

export function privateVersionStorageKey(userId, documentId, versionId) {
  if (!isInternalDocumentId(documentId, "doc") || !isInternalDocumentId(versionId, "ver")) {
    throw new PrivateCloudSecurityError("invalid_internal_path", "The internal document path is invalid.", 500);
  }
  return `users/${encodeVerifiedUserId(userId)}/documents/${documentId}/versions/${versionId}.pdf`;
}

export function validateBeginUploadInput(input, {
  maximumFileBytes = PRIVATE_CLOUD_SECURITY_LIMITS.hardMaxPdfBytes,
} = {}) {
  const value = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const allowedFields = new Set([
    "fileName",
    "sizeBytes",
    "contentType",
    "checksumSha256",
    "documentId",
    "idempotencyKey",
  ]);
  if (Object.keys(value).some((key) => !allowedFields.has(key))) {
    throw new PrivateCloudSecurityError(
      "client_routing_field_forbidden",
      "Cloud ownership and storage paths are assigned by the server.",
    );
  }

  const declaredSize = safeInteger(
    value.sizeBytes,
    "invalid_size",
    "The declared PDF size must be an integer.",
  );
  if (declaredSize <= 0 || declaredSize > Math.min(maximumFileBytes, PRIVATE_CLOUD_SECURITY_LIMITS.hardMaxPdfBytes)) {
    throw new PrivateCloudSecurityError("file_size_not_allowed", "The PDF is outside the configured upload-size limit.", 413);
  }
  if (String(value.contentType || "").toLowerCase() !== PDF_MIME) {
    throw new PrivateCloudSecurityError("invalid_content_type", "Only application/pdf uploads are accepted.", 415);
  }
  const suppliedFileName = String(value.fileName || "").trim();
  if (!suppliedFileName || !/\.pdf$/i.test(suppliedFileName)) {
    throw new PrivateCloudSecurityError("invalid_file_extension", "Only files with a .pdf extension are accepted.", 415);
  }
  if (!IDEMPOTENCY_KEY_PATTERN.test(String(value.idempotencyKey || ""))) {
    throw new PrivateCloudSecurityError("invalid_idempotency_key", "A 16–128 character idempotency key is required.");
  }
  if (value.documentId != null && !isInternalDocumentId(value.documentId, "doc")) {
    throw new PrivateCloudSecurityError("invalid_document_id", "The document identifier is invalid.");
  }
  const expectedSha256 = String(value.checksumSha256 || "").toLowerCase();
  if (!SHA256_PATTERN.test(expectedSha256)) {
    throw new PrivateCloudSecurityError("invalid_checksum", "The expected SHA-256 checksum is invalid.");
  }
  return Object.freeze({
    documentId: value.documentId || null,
    declaredSize,
    contentType: PDF_MIME,
    displayName: sanitizePdfDisplayName(suppliedFileName),
    idempotencyKey: String(value.idempotencyKey),
    expectedSha256,
  });
}

export function sha256Hex(value) {
  return createHash("sha256").update(bytes(value)).digest("hex");
}

export function uploadIntentKey(userId, idempotencyKey) {
  if (!IDEMPOTENCY_KEY_PATTERN.test(String(idempotencyKey || ""))) {
    throw new PrivateCloudSecurityError("invalid_idempotency_key", "The upload idempotency key is invalid.");
  }
  return createHash("sha256").update(`${String(userId)}\u0000${idempotencyKey}`).digest("hex");
}

export function inspectPdfBytes(value, {
  maximumFileBytes = PRIVATE_CLOUD_SECURITY_LIMITS.hardMaxPdfBytes,
} = {}) {
  const data = bytes(value);
  if (!data.byteLength) throw new PrivateCloudSecurityError("empty_pdf", "The uploaded PDF is empty.");
  if (data.byteLength > Math.min(maximumFileBytes, PRIVATE_CLOUD_SECURITY_LIMITS.hardMaxPdfBytes)) {
    throw new PrivateCloudSecurityError("file_size_not_allowed", "The uploaded PDF exceeds the configured size limit.", 413);
  }

  const prefix = Buffer.from(data.subarray(0, Math.min(16, data.byteLength))).toString("latin1");
  if (!PDF_HEADER_PATTERN.test(prefix)) {
    throw new PrivateCloudSecurityError("invalid_pdf_magic", "The uploaded file does not have a supported PDF signature.", 415);
  }

  const tailStart = Math.max(0, data.byteLength - 4_096);
  const tail = Buffer.from(data.subarray(tailStart)).toString("latin1");
  const eofIndex = tail.lastIndexOf("%%EOF");
  if (eofIndex < 0) {
    throw new PrivateCloudSecurityError("missing_pdf_eof", "The uploaded PDF is incomplete or malformed.", 422);
  }
  const trailing = tail.slice(eofIndex + 5);
  const hasUnsupportedTrailingByte = Array.from(trailing).some((character) => (
    ![0, 9, 10, 12, 13, 32].includes(character.charCodeAt(0))
  ));
  if (hasUnsupportedTrailingByte) {
    throw new PrivateCloudSecurityError("pdf_trailing_payload", "The uploaded PDF contains unsupported trailing data.", 422);
  }

  // This fast scan catches clear-text active content before the full PDF parser
  // runs. The production finalizer also inspects parsed JavaScript, attachments,
  // annotations, and encryption state; this byte scan alone is not a sandbox.
  const source = Buffer.from(data).toString("latin1");
  for (const forbidden of FORBIDDEN_PDF_FEATURES) {
    if (forbidden.pattern.test(source)) {
      throw new PrivateCloudSecurityError(forbidden.code, "The PDF contains an unsupported active-content feature.", 422);
    }
  }
  return Object.freeze({
    byteLength: data.byteLength,
    sha256: sha256Hex(data),
    header: prefix.slice(0, 8),
  });
}

export function assertChecksum(expectedSha256, actualSha256) {
  const expected = String(expectedSha256 || "").toLowerCase();
  const actual = String(actualSha256 || "").toLowerCase();
  if (!SHA256_PATTERN.test(expected) || !SHA256_PATTERN.test(actual) || !constantTimeTextEqual(expected, actual)) {
    throw new PrivateCloudSecurityError("checksum_mismatch", "The uploaded PDF checksum did not match.", 422);
  }
  return true;
}

export function assertStorageQuota({
  usage = {},
  declaredSize,
  createsDocument,
  existingVersionCount = 0,
  maximumAccountBytes,
  maximumDocuments = PRIVATE_CLOUD_SECURITY_LIMITS.maximumDocumentsPerAccount,
  maximumVersions = PRIVATE_CLOUD_SECURITY_LIMITS.maximumVersionsPerDocument,
}) {
  safeInteger(maximumAccountBytes, "quota_not_configured", "The account storage quota is not configured.");
  if (maximumAccountBytes <= 0) {
    throw new PrivateCloudSecurityError("quota_not_configured", "The account storage quota is not configured.", 503);
  }
  const activeBytes = Math.max(0, Number(usage.activeBytes) || 0);
  const reservedBytes = Math.max(0, Number(usage.reservedBytes) || 0);
  const documentCount = Math.max(0, Number(usage.documentCount) || 0);
  if (activeBytes + reservedBytes + declaredSize > maximumAccountBytes) {
    throw new PrivateCloudSecurityError("account_quota_exceeded", "This upload would exceed the account storage quota.", 413);
  }
  if (createsDocument && documentCount + 1 > maximumDocuments) {
    throw new PrivateCloudSecurityError("document_quota_exceeded", "This account has reached its document limit.", 409);
  }
  if (existingVersionCount + 1 > maximumVersions) {
    throw new PrivateCloudSecurityError("version_quota_exceeded", "This document has reached its version limit.", 409);
  }
  return true;
}

export function createUploadPlan({
  verifiedUserId,
  validatedInput,
  existingDocument = null,
  usage = {},
  existingVersionCount = 0,
  maximumAccountBytes,
  now = new Date(),
  randomBytes = nodeRandomBytes,
}) {
  const documentId = existingDocument?.documentId || validatedInput.documentId || createInternalId("doc", randomBytes);
  if (validatedInput.documentId && existingDocument?.documentId !== validatedInput.documentId) {
    throw new PrivateCloudSecurityError("document_not_found", "The requested document is unavailable.", 404);
  }
  const versionId = createInternalId("ver", randomBytes);
  assertStorageQuota({
    usage,
    declaredSize: validatedInput.declaredSize,
    createsDocument: !existingDocument,
    existingVersionCount,
    maximumAccountBytes,
  });
  const createdAt = now.toISOString();
  return Object.freeze({
    documentId,
    versionId,
    storageKey: privateVersionStorageKey(verifiedUserId, documentId, versionId),
    displayName: validatedInput.displayName,
    declaredSize: validatedInput.declaredSize,
    contentType: PDF_MIME,
    expectedSha256: validatedInput.expectedSha256,
    idempotencyKeyHash: uploadIntentKey(verifiedUserId, validatedInput.idempotencyKey),
    createdAt,
    expiresAt: new Date(now.getTime() + PRIVATE_CLOUD_SECURITY_LIMITS.uploadIntentLifetimeMs).toISOString(),
  });
}

export function isRecentAuthentication(authTimeSeconds, {
  now = new Date(),
  maximumAgeSeconds = PRIVATE_CLOUD_SECURITY_LIMITS.recentAuthenticationSeconds,
} = {}) {
  const authTime = Number(authTimeSeconds);
  if (!Number.isFinite(authTime) || authTime <= 0) return false;
  const age = Math.floor(now.getTime() / 1_000) - authTime;
  return age >= 0 && age <= maximumAgeSeconds;
}

export function contentDispositionForPdf(displayName) {
  const safeName = sanitizePdfDisplayName(displayName);
  const ascii = safeName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safeName)}`;
}

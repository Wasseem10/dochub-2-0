import { getToken as getAppCheckToken } from "firebase/app-check";
import { appCheck, auth } from "../firebase.js";

const API_VERSION = "/v1";
const DEFAULT_PRIVATE_CLOUD_API_BASE_URL =
  "https://udtddtoghuuazlczgkuf.supabase.co/functions/v1/private-cloud";
const CLOUD_HISTORY_KEY = "pdfenrich.private-cloud-history.v1";
const MAX_UPLOAD_ATTEMPTS = 3;
const UPLOAD_REQUEST_TIMEOUT_MS = 120_000;

function normalizeApiBaseUrl(value) {
  const candidate = String(value || "").trim().replace(/\/+$/, "");
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    if (url.protocol !== "https:" && !isLocal) return "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

export const PRIVATE_CLOUD_API_BASE_URL = normalizeApiBaseUrl(
  import.meta.env.VITE_PRIVATE_CLOUD_API_BASE_URL || DEFAULT_PRIVATE_CLOUD_API_BASE_URL,
);
export const isPrivateCloudConfigured = Boolean(PRIVATE_CLOUD_API_BASE_URL && auth);

export class PrivateCloudError extends Error {
  constructor(message, { code = "cloud_unavailable", status = 0, retryable = false } = {}) {
    super(message);
    this.name = "PrivateCloudError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

const CLOUD_DOCUMENT_ID_PATTERN = /^doc_[A-Za-z0-9_-]{24}$/;
const CLOUD_VERSION_ID_PATTERN = /^ver_[A-Za-z0-9_-]{24}$/;
const CLOUD_UPLOAD_ID_PATTERN = /^[a-f0-9]{64}$/;

function assertTerminalDocumentRecord(record, { blob, checksumSha256 }) {
  if (
    record?.state !== "active"
    || record?.verified !== true
    || !CLOUD_DOCUMENT_ID_PATTERN.test(String(record.documentId || ""))
    || !CLOUD_VERSION_ID_PATTERN.test(String(record.versionId || ""))
    || record.checksumSha256 !== checksumSha256
    || Number(record.sizeBytes) !== blob.size
  ) {
    throw new PrivateCloudError("The private cloud save was not fully verified.", {
      code: "save_unconfirmed",
      status: 503,
      retryable: true,
    });
  }
  return record;
}

function readErrorMessage(payload, fallback) {
  const code = String(payload?.error?.code || payload?.code || "");
  const known = {
    auth_required: "Sign in again before using private cloud storage.",
    authentication_required: "Sign in again before using private cloud storage.",
    invalid_authentication: "Sign in again before using private cloud storage.",
    app_check_required: "This browser could not be verified. Refresh the page and try again.",
    invalid_pdf: "This file did not pass the private-cloud PDF safety checks.",
    encrypted_pdf: "Encrypted PDFs are not supported for private cloud saving.",
    file_too_large: "This PDF is larger than the private-cloud file limit.",
    file_size_not_allowed: "This PDF is larger than the private-cloud file limit.",
    quota_exceeded: "Your private cloud storage quota is full.",
    account_quota_exceeded: "Your private cloud storage quota is full.",
    upload_incomplete: "The upload was interrupted before the entire PDF arrived.",
    checksum_mismatch: "The uploaded PDF could not be verified. Try saving it again.",
    rate_limited: "Too many cloud requests were made. Wait a moment and try again.",
    rate_limit_exceeded: "Too many cloud requests were made. Wait a moment and try again.",
    not_found: "That private cloud document is no longer available.",
    forbidden: "This account does not have access to that document.",
    recent_auth_required: "Sign in again before permanently deleting cloud data.",
    recent_authentication_required: "Sign in again before permanently deleting cloud data.",
  };
  return known[code] || fallback;
}

async function buildAuthorizationHeaders({ idempotencyKey = "", expectedUserId = "" } = {}) {
  const firebaseUser = auth?.currentUser;
  if (!firebaseUser) {
    throw new PrivateCloudError("Sign in before using private cloud storage.", {
      code: "auth_required",
      status: 401,
    });
  }
  if (expectedUserId && firebaseUser.uid !== expectedUserId) {
    throw new PrivateCloudError("The active account changed before the cloud request started.", {
      code: "auth_changed",
      status: 409,
    });
  }
  const idToken = await firebaseUser.getIdToken();
  const headers = {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json",
  };
  if (appCheck) {
    const tokenResult = await getAppCheckToken(appCheck, false);
    if (tokenResult?.token) headers["X-Firebase-AppCheck"] = tokenResult.token;
  }
  if (expectedUserId && auth?.currentUser?.uid !== expectedUserId) {
    throw new PrivateCloudError("The active account changed during the cloud request.", {
      code: "auth_changed",
      status: 409,
    });
  }
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  return headers;
}

async function apiRequest(path, {
  method = "GET",
  body,
  idempotencyKey = "",
  expectedUserId = "",
  signal,
  responseType = "json",
} = {}) {
  if (!isPrivateCloudConfigured) {
    throw new PrivateCloudError(
      "Private cloud saving has not been configured for this deployment. Your document remains in this browser.",
      { code: "cloud_not_configured" },
    );
  }
  let response;
  try {
    const headers = await buildAuthorizationHeaders({ idempotencyKey, expectedUserId });
    if (body === undefined) delete headers["Content-Type"];
    response = await fetch(`${PRIVATE_CLOUD_API_BASE_URL}${API_VERSION}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new PrivateCloudError(
      "Private cloud storage is temporarily unavailable. Your local copy is still safe.",
      { code: "network_error", retryable: true },
    );
  }
  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      // Never echo a provider response body or URL into the UI.
    }
    const status = response.status;
    throw new PrivateCloudError(
      readErrorMessage(payload, status >= 500
        ? "Private cloud storage is temporarily unavailable. Your local copy is still safe."
        : "The private cloud request could not be completed."),
      {
        code: String(payload?.error?.code || payload?.code || "cloud_request_failed"),
        status,
        retryable: status === 408 || status === 409 || status === 425 || status === 429 || status >= 500,
      },
    );
  }
  if (responseType === "blob") return response.blob();
  if (response.status === 204) return null;
  return response.json();
}

function xhrUpload({ sessionUrl, blob, startOffset = 0, signal, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const chunk = startOffset ? blob.slice(startOffset) : blob;
    xhr.open("PUT", sessionUrl);
    xhr.timeout = UPLOAD_REQUEST_TIMEOUT_MS;
    xhr.setRequestHeader("Content-Type", "application/pdf");
    xhr.setRequestHeader("Content-Range", `bytes ${startOffset}-${blob.size - 1}/${blob.size}`);
    xhr.responseType = "text";
    xhr.upload.onprogress = (event) => {
      const transferred = startOffset + (event.lengthComputable ? event.loaded : 0);
      onProgress?.(Math.min(99, Math.round((transferred / blob.size) * 100)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve({ complete: true, offset: blob.size });
        return;
      }
      if (xhr.status === 308) {
        const range = xhr.getResponseHeader("Range") || "";
        const match = range.match(/bytes=0-(\d+)/i);
        resolve({ complete: false, offset: match ? Number(match[1]) + 1 : startOffset });
        return;
      }
      reject(new PrivateCloudError("The PDF upload was interrupted.", {
        code: "upload_interrupted",
        status: xhr.status,
        retryable: xhr.status === 0 || xhr.status === 408 || xhr.status === 429 || xhr.status >= 500,
      }));
    };
    xhr.onerror = () => reject(new PrivateCloudError("The PDF upload was interrupted.", {
      code: "upload_interrupted",
      retryable: true,
    }));
    xhr.ontimeout = () => reject(new PrivateCloudError("The PDF upload timed out.", {
      code: "upload_timeout",
      retryable: true,
    }));
    xhr.onabort = () => reject(new DOMException("Upload cancelled.", "AbortError"));
    const abort = () => xhr.abort();
    signal?.addEventListener("abort", abort, { once: true });
    xhr.onloadend = () => signal?.removeEventListener("abort", abort);
    xhr.send(chunk);
  });
}

async function queryResumableOffset(sessionUrl, totalSize, signal) {
  const response = await fetch(sessionUrl, {
    method: "PUT",
    headers: {
      "Content-Range": `bytes */${totalSize}`,
    },
    body: new Blob([]),
    signal,
    credentials: "omit",
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });
  if (response.ok) return { complete: true, offset: totalSize };
  if (response.status !== 308) {
    throw new PrivateCloudError("The upload status could not be verified.", {
      code: "upload_status_unavailable",
      status: response.status,
      retryable: response.status === 408 || response.status === 429 || response.status >= 500,
    });
  }
  const range = response.headers.get("Range") || "";
  const match = range.match(/bytes=0-(\d+)/i);
  return { complete: false, offset: match ? Number(match[1]) + 1 : 0 };
}

function waitForUploadRetry(attempt, signal) {
  return new Promise((resolve, reject) => {
    const finish = () => {
      signal?.removeEventListener("abort", abort);
      resolve();
    };
    const timer = globalThis.setTimeout(finish, Math.min(1_500, attempt * 300));
    const abort = () => {
      globalThis.clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(new DOMException("Upload cancelled.", "AbortError"));
    };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
  });
}

export async function uploadPdfToResumableSession({
  sessionUrl,
  blob,
  signal,
  onProgress,
  maxAttempts = MAX_UPLOAD_ATTEMPTS,
}) {
  if (!(blob instanceof Blob) || blob.type !== "application/pdf" || !blob.size) {
    throw new PrivateCloudError("Only a non-empty PDF can be uploaded.", { code: "invalid_pdf" });
  }
  let offset = 0;
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await xhrUpload({ sessionUrl, blob, startOffset: offset, signal, onProgress });
      if (result.complete) return;
      offset = result.offset;
    } catch (error) {
      if (error?.name === "AbortError" || !error?.retryable || attempt === maxAttempts) throw error;
      lastError = error;
      await waitForUploadRetry(attempt, signal);
      try {
        const uploadStatus = await queryResumableOffset(sessionUrl, blob.size, signal);
        if (uploadStatus.complete || uploadStatus.offset >= blob.size) {
          onProgress?.(100);
          return;
        }
        offset = uploadStatus.offset;
      } catch (statusError) {
        if (statusError?.name === "AbortError" || attempt === maxAttempts) throw statusError;
        lastError = statusError;
        continue;
      }
    }
  }
  throw lastError || new PrivateCloudError("The PDF upload could not be completed.", {
    code: "upload_interrupted",
    retryable: true,
  });
}

export async function sha256Hex(blob) {
  const bytes = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createCloudIdempotencyKey() {
  return typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isTrustedResumableSessionUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return (
      url.protocol === "https:"
      && !url.username
      && !url.password
      && url.hostname === "storage.googleapis.com"
      && url.pathname.startsWith("/upload/")
    );
  } catch {
    return false;
  }
}

function isTrustedSupabaseSignedUploadUrl(value) {
  try {
    const url = new URL(String(value || ""));
    const apiOrigin = new URL(PRIVATE_CLOUD_API_BASE_URL).origin;
    return (
      url.protocol === "https:"
      && url.origin === apiOrigin
      && !url.username
      && !url.password
      && url.pathname.startsWith("/storage/v1/object/upload/sign/pdfenrich-private-documents/")
      && url.searchParams.has("token")
    );
  } catch {
    return false;
  }
}

function uploadPdfToSignedSession({ sessionUrl, blob, signal, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", sessionUrl);
    xhr.timeout = UPLOAD_REQUEST_TIMEOUT_MS;
    xhr.setRequestHeader("Content-Type", "application/pdf");
    xhr.responseType = "text";
    xhr.upload.onprogress = (event) => {
      const transferred = event.lengthComputable ? event.loaded : 0;
      onProgress?.(Math.min(99, Math.round((transferred / blob.size) * 100)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      reject(new PrivateCloudError("The PDF upload was interrupted.", {
        code: "upload_interrupted",
        status: xhr.status,
        retryable: xhr.status === 0 || xhr.status === 408 || xhr.status === 409
          || xhr.status === 429 || xhr.status >= 500,
      }));
    };
    xhr.onerror = () => reject(new PrivateCloudError("The PDF upload was interrupted.", {
      code: "upload_interrupted",
      retryable: true,
    }));
    xhr.ontimeout = () => reject(new PrivateCloudError("The PDF upload timed out.", {
      code: "upload_timeout",
      retryable: true,
    }));
    xhr.onabort = () => reject(new DOMException("Upload cancelled.", "AbortError"));
    const abort = () => xhr.abort();
    signal?.addEventListener("abort", abort, { once: true });
    xhr.onloadend = () => signal?.removeEventListener("abort", abort);
    xhr.send(blob);
  });
}

export function readCloudHistoryPreference(userId) {
  if (!userId) return false;
  try {
    const records = JSON.parse(window.localStorage.getItem(CLOUD_HISTORY_KEY) || "{}");
    return records?.[userId] === true;
  } catch {
    return false;
  }
}

export function writeCloudHistoryPreference(userId, enabled) {
  if (!userId) return;
  try {
    const records = JSON.parse(window.localStorage.getItem(CLOUD_HISTORY_KEY) || "{}");
    records[userId] = Boolean(enabled);
    window.localStorage.setItem(CLOUD_HISTORY_KEY, JSON.stringify(records));
  } catch {
    // The account setting remains authoritative if this browser blocks preferences.
  }
}

export function clearCloudHistoryPreference(userId) {
  if (!userId) return true;
  try {
    const records = JSON.parse(window.localStorage.getItem(CLOUD_HISTORY_KEY) || "{}");
    delete records[userId];
    if (Object.keys(records).length) {
      window.localStorage.setItem(CLOUD_HISTORY_KEY, JSON.stringify(records));
    } else {
      window.localStorage.removeItem(CLOUD_HISTORY_KEY);
    }
    return readCloudHistoryPreference(userId) === false;
  } catch {
    // The caller must not report complete browser cleanup.
    return false;
  }
}

export async function getPrivateCloudStatus({ signal, expectedUserId = "" } = {}) {
  const result = await apiRequest("/cloud-history", { signal, expectedUserId });
  if (typeof result?.enabled !== "boolean") {
    throw new PrivateCloudError("Private cloud history status was not verified.", {
      code: "cloud_status_unconfirmed",
      status: 503,
      retryable: true,
    });
  }
  return result;
}

export async function setPrivateCloudHistoryEnabled(enabled, { signal, expectedUserId = "" } = {}) {
  const result = await apiRequest("/cloud-history", {
    method: "PUT",
    body: { enabled: Boolean(enabled) },
    signal,
    expectedUserId,
  });
  if (result?.enabled !== Boolean(enabled)) {
    throw new PrivateCloudError("Private cloud history status was not verified.", {
      code: "cloud_status_unconfirmed",
      status: 503,
      retryable: true,
    });
  }
  writeCloudHistoryPreference(expectedUserId || auth?.currentUser?.uid, Boolean(result?.enabled));
  return result;
}

export async function listPrivateCloudDocuments({
  includeDeleted = false,
  signal,
  expectedUserId = "",
} = {}) {
  const documents = [];
  let cursor = "";
  for (let page = 0; page < 100; page += 1) {
    const query = new URLSearchParams({ limit: "100" });
    if (includeDeleted) query.set("includeDeleted", "true");
    if (cursor) query.set("cursor", cursor);
    const result = await apiRequest(`/documents?${query.toString()}`, { signal, expectedUserId });
    if (!Array.isArray(result?.documents)) {
      throw new PrivateCloudError("Private cloud history was not verified.", {
        code: "cloud_list_unconfirmed",
        status: 503,
        retryable: true,
      });
    }
    documents.push(...result.documents);
    if (!result.nextCursor) return { documents, nextCursor: null };
    if (!CLOUD_DOCUMENT_ID_PATTERN.test(String(result.nextCursor)) || result.nextCursor === cursor) {
      throw new PrivateCloudError("Private cloud history pagination was invalid.", {
        code: "cloud_list_unconfirmed",
        status: 503,
        retryable: true,
      });
    }
    cursor = result.nextCursor;
  }
  throw new PrivateCloudError("Private cloud history exceeded the safe pagination limit.", {
    code: "cloud_list_unconfirmed",
    status: 503,
    retryable: true,
  });
}

export async function savePrivateCloudPdf({
  blob,
  fileName,
  cloudDocumentId = "",
  checksumSha256: suppliedChecksumSha256 = "",
  idempotencyKey = createCloudIdempotencyKey(),
  onProgress,
  signal,
  expectedUserId = "",
}) {
  const checksumSha256 = suppliedChecksumSha256 || await sha256Hex(blob);
  if (!/^[a-f0-9]{64}$/.test(checksumSha256)) {
    throw new PrivateCloudError("The private cloud checksum is invalid.", {
      code: "checksum_mismatch",
    });
  }
  const begin = await apiRequest("/documents/uploads", {
    method: "POST",
    idempotencyKey,
    expectedUserId,
    signal,
    body: {
      fileName,
      sizeBytes: blob.size,
      contentType: "application/pdf",
      checksumSha256,
      documentId: cloudDocumentId || undefined,
    },
  });
  if (begin?.state === "active") {
    return {
      ...assertTerminalDocumentRecord(begin, { blob, checksumSha256 }),
      idempotencyKey,
    };
  }
  const validReservedUpload = (
    CLOUD_UPLOAD_ID_PATTERN.test(String(begin?.uploadId || ""))
    && CLOUD_DOCUMENT_ID_PATTERN.test(String(begin?.documentId || ""))
    && CLOUD_VERSION_ID_PATTERN.test(String(begin?.versionId || ""))
  );
  if (
    !validReservedUpload
    || !["uploading", "ready_to_finalize"].includes(begin?.state)
    || (
      begin.state === "uploading"
      && !isTrustedResumableSessionUrl(begin.uploadSessionUrl)
      && !isTrustedSupabaseSignedUploadUrl(begin.uploadSessionUrl)
    )
  ) {
    throw new PrivateCloudError("The private upload session was not verified.", {
      code: "upload_session_unconfirmed",
      status: 503,
      retryable: true,
    });
  }
  let uploadError = null;
  if (begin.state === "uploading") {
    try {
      if (isTrustedSupabaseSignedUploadUrl(begin.uploadSessionUrl)) {
        await uploadPdfToSignedSession({
          sessionUrl: begin.uploadSessionUrl,
          blob,
          signal,
          onProgress,
        });
      } else {
        await uploadPdfToResumableSession({
          sessionUrl: begin.uploadSessionUrl,
          blob,
          signal,
          onProgress,
        });
      }
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      uploadError = error;
    }
  } else {
    onProgress?.(100);
  }
  let finalized;
  try {
    // Finalization is also the authoritative probe after an ambiguous signed-upload response.
    finalized = await apiRequest(`/documents/uploads/${encodeURIComponent(begin.uploadId)}/finalize`, {
      method: "POST",
      idempotencyKey,
      expectedUserId,
      signal,
      body: { checksumSha256 },
    });
  } catch (error) {
    throw uploadError || error;
  }
  return {
    ...assertTerminalDocumentRecord(finalized, { blob, checksumSha256 }),
    idempotencyKey,
  };
}

export async function downloadPrivateCloudPdf(documentId, {
  signal,
  versionId = "",
  expectedUserId = "",
} = {}) {
  const suffix = versionId ? `?versionId=${encodeURIComponent(versionId)}` : "";
  const blob = await apiRequest(`/documents/${encodeURIComponent(documentId)}/download${suffix}`, {
    signal,
    expectedUserId,
    responseType: "blob",
  });
  const signature = new TextDecoder("latin1").decode(await blob.slice(0, 8).arrayBuffer());
  if (
    blob.type !== "application/pdf"
    || blob.size <= 0
    || blob.size > 50 * 1024 * 1024
    || !signature.startsWith("%PDF-")
  ) {
    throw new PrivateCloudError("The private cloud download failed PDF verification.", {
      code: "download_unconfirmed",
      status: 503,
      retryable: true,
    });
  }
  return blob;
}

export async function removePrivateCloudDocument(documentId, {
  permanent = false,
  signal,
  expectedUserId = "",
} = {}) {
  const suffix = permanent ? "?permanent=true" : "";
  const result = await apiRequest(`/documents/${encodeURIComponent(documentId)}${suffix}`, {
    method: "DELETE",
    signal,
    expectedUserId,
  });
  const expectedState = permanent ? "deleted" : "trashed";
  if (
    result?.documentId !== documentId
    || result?.state !== expectedState
    || result?.deleteConfirmed !== true
  ) {
    throw new PrivateCloudError("Private cloud deletion was not confirmed.", {
      code: "delete_unconfirmed",
      status: 503,
      retryable: true,
    });
  }
  return result;
}

export async function restorePrivateCloudDocument(documentId, {
  versionId = "",
  signal,
  expectedUserId = "",
} = {}) {
  const path = versionId
    ? `/documents/${encodeURIComponent(documentId)}/versions/${encodeURIComponent(versionId)}/restore`
    : `/documents/${encodeURIComponent(documentId)}/restore`;
  const result = await apiRequest(path, {
    method: "POST",
    signal,
    expectedUserId,
  });
  if (
    result?.documentId !== documentId
    || result?.state !== "active"
    || result?.restoreConfirmed !== true
  ) {
    throw new PrivateCloudError("Private cloud restore was not confirmed.", {
      code: "restore_unconfirmed",
      status: 503,
      retryable: true,
    });
  }
  return result;
}

export async function deletePrivateCloudAccountData({ signal, expectedUserId = "" } = {}) {
  const result = await apiRequest("/account/data", {
    method: "DELETE",
    signal,
    expectedUserId,
  });
  if (result?.state !== "complete" || result?.purgeConfirmed !== true) {
    throw new PrivateCloudError("Private cloud deletion was not confirmed.", {
      code: "account_purge_unconfirmed",
      status: 503,
      retryable: true,
    });
  }
  return result;
}

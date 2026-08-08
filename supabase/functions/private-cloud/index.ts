import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { EncryptedPDFError, PDFDocument } from "pdf-lib";

const FIREBASE_PROJECT_ID = "pdf-editor-1137a";
const FIREBASE_WEB_API_KEY = "AIzaSyDciB_bwz04gAkgGTWAbctTZ2IMhslCE54";
const FIREBASE_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
const FIREBASE_JWKS = createRemoteJWKSet(new URL(
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
));
const PRIVATE_BUCKET = "pdfenrich-private-documents";
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ACCOUNT_QUOTA_BYTES = 200 * 1024 * 1024;
const RECENT_AUTH_SECONDS = 5 * 60;
const DOCUMENT_ID_PATTERN = /^doc_[A-Za-z0-9_-]{24}$/;
const VERSION_ID_PATTERN = /^ver_[A-Za-z0-9_-]{24}$/;
const UPLOAD_ID_PATTERN = /^[a-f0-9]{64}$/;
const CHECKSUM_PATTERN = /^[a-f0-9]{64}$/;
const ALLOWED_ORIGINS = new Set([
  "https://pdfenrich.com",
  "https://www.pdfenrich.com",
  "https://realpdf-workspace.wasseem10.chatgpt.site",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

type FirebaseIdentity = {
  uid: string;
  authTime: number;
};

class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase runtime configuration is missing.");

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function securityHeaders(origin = "") {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store, max-age=0",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Vary": "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, PUT, POST, DELETE, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Idempotency-Key, X-Firebase-AppCheck";
    headers["Access-Control-Max-Age"] = "600";
  }
  return headers;
}

function jsonResponse(payload: unknown, status = 200, origin = "") {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...securityHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function safeErrorResponse(error: unknown, origin: string) {
  const known = error instanceof ApiError
    ? error
    : new ApiError("cloud_unavailable", "Private cloud storage is temporarily unavailable.", 503);
  return jsonResponse({
    ok: false,
    error: { code: known.code, message: known.message },
  }, known.status, origin);
}

function requireAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin") || "";
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    throw new ApiError("origin_not_allowed", "This website origin is not allowed.", 403);
  }
  return origin;
}

async function verifyFirebaseIdentity(request: Request): Promise<FirebaseIdentity> {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) throw new ApiError("authentication_required", "Sign in again before using private cloud storage.", 401);

  let payload;
  try {
    ({ payload } = await jwtVerify(token, FIREBASE_JWKS, {
      issuer: FIREBASE_ISSUER,
      audience: FIREBASE_PROJECT_ID,
      algorithms: ["RS256"],
      clockTolerance: 30,
    }));
  } catch {
    throw new ApiError("invalid_authentication", "Sign in again before using private cloud storage.", 401);
  }

  const uid = String(payload.sub || "");
  const authTime = Number(payload.auth_time || 0);
  if (!uid || uid.length > 128 || !Number.isFinite(authTime)) {
    throw new ApiError("invalid_authentication", "Sign in again before using private cloud storage.", 401);
  }

  let accountPayload: { users?: Array<{ localId?: string; disabled?: boolean; validSince?: string }> };
  try {
    const lookup = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      },
    );
    if (!lookup.ok) throw new Error("lookup_failed");
    accountPayload = await lookup.json();
  } catch {
    throw new ApiError("invalid_authentication", "Sign in again before using private cloud storage.", 401);
  }
  const account = accountPayload.users?.[0];
  const validSince = Number(account?.validSince || 0);
  if (account?.localId !== uid || account?.disabled || (validSince && authTime < validSince)) {
    throw new ApiError("invalid_authentication", "Sign in again before using private cloud storage.", 401);
  }
  return { uid, authTime };
}

function routePath(request: Request) {
  const pathname = new URL(request.url).pathname.replace(/\/+$/, "");
  const functionMarker = "/private-cloud";
  const markerIndex = pathname.indexOf(functionMarker);
  return markerIndex >= 0 ? (pathname.slice(markerIndex + functionMarker.length) || "/") : pathname;
}

async function readJsonBody(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > 8192) throw new ApiError("invalid_request_body", "The request body is too large.", 413);
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid");
    return value as Record<string, unknown>;
  } catch {
    throw new ApiError("invalid_request_body", "A valid JSON request body is required.");
  }
}

function assertMethod(request: Request, expected: string) {
  if (request.method !== expected) throw new ApiError("method_not_allowed", "This HTTP method is not allowed.", 405);
}

function sanitizePdfName(value: unknown) {
  let name = String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.trim() || "document.pdf";
  if (!/\.pdf$/i.test(name)) name += ".pdf";
  if (name.length > 180) name = `${name.slice(0, 176).replace(/\.+$/, "")}.pdf`;
  return name || "document.pdf";
}

function randomBytes(length: number) {
  return crypto.getRandomValues(new Uint8Array(length));
}

function opaqueId(prefix: "doc" | "ver") {
  const value = btoa(String.fromCharCode(...randomBytes(18)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${prefix}_${value}`;
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Text(value: string) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}

async function sha256Bytes(value: Uint8Array) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", value)));
}

function storageUserSegment(uid: string) {
  return btoa(uid).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function storagePath(uid: string, documentId: string, versionId: string) {
  return `users/${storageUserSegment(uid)}/documents/${documentId}/versions/${versionId}.pdf`;
}

function toIso(value: unknown) {
  const parsed = new Date(String(value || ""));
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function publicDocument(record: Record<string, unknown>) {
  return {
    documentId: record.id,
    displayName: record.display_name,
    state: record.state,
    currentVersionId: record.current_version_id,
    sizeBytes: Number(record.size_bytes),
    checksumSha256: record.checksum_sha256,
    pageCount: Number(record.page_count),
    createdAt: toIso(record.created_at),
    updatedAt: toIso(record.updated_at),
    trashedAt: record.trashed_at ? toIso(record.trashed_at) : null,
  };
}

async function inspectPdf(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) {
    throw new ApiError("file_size_not_allowed", "The PDF exceeds the private cloud file limit.", 413);
  }
  const decoder = new TextDecoder("latin1");
  const header = decoder.decode(bytes.slice(0, Math.min(bytes.length, 1024)));
  const tail = decoder.decode(bytes.slice(Math.max(0, bytes.length - 4096)));
  if (!header.startsWith("%PDF-") || !tail.includes("%%EOF")) {
    throw new ApiError("invalid_pdf", "The uploaded file did not pass PDF validation.", 422);
  }

  let overlap = "";
  for (let offset = 0; offset < bytes.length; offset += 1024 * 1024) {
    const text = overlap + decoder.decode(bytes.slice(offset, Math.min(bytes.length, offset + 1024 * 1024)));
    if (/\/Encrypt\b/.test(text)) {
      throw new ApiError("encrypted_pdf", "Encrypted PDFs are not supported for private cloud saving.", 422);
    }
    overlap = text.slice(-64);
  }

  let pageCount = 0;
  try {
    const document = await PDFDocument.load(bytes, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
    pageCount = document.getPageCount();
  } catch (error) {
    if (error instanceof EncryptedPDFError) {
      throw new ApiError("encrypted_pdf", "Encrypted PDFs are not supported for private cloud saving.", 422);
    }
    throw new ApiError("invalid_pdf", "The uploaded PDF page structure could not be verified.", 422);
  }
  if (pageCount < 1 || pageCount > 10000) {
    throw new ApiError("invalid_pdf", "The uploaded PDF page structure could not be verified.", 422);
  }
  return { pageCount };
}

async function storageObjectPresent(path: string, expectedSize?: number) {
  const slash = path.lastIndexOf("/");
  const folder = path.slice(0, slash);
  const name = path.slice(slash + 1);
  const { data, error } = await admin.storage.from(PRIVATE_BUCKET).list(folder, {
    limit: 2,
    search: name,
  });
  if (error) throw new ApiError("cloud_unavailable", "Private cloud storage is temporarily unavailable.", 503);
  const match = data?.find((entry) => entry.name === name);
  if (!match) return false;
  const size = Number(match.metadata?.size || 0);
  return expectedSize === undefined || size === expectedSize;
}

async function enforceAccountQuota(uid: string, incomingBytes: number) {
  const [{ data: versions, error: versionsError }, { data: pending, error: pendingError }] = await Promise.all([
    admin.from("private_cloud_document_versions").select("size_bytes").eq("firebase_uid", uid),
    admin.from("private_cloud_upload_intents").select("size_bytes").eq("firebase_uid", uid).eq("state", "uploading"),
  ]);
  if (versionsError || pendingError) throw new ApiError("cloud_unavailable", "Private cloud storage is temporarily unavailable.", 503);
  const used = [...(versions || []), ...(pending || [])]
    .reduce((total, row) => total + Number(row.size_bytes || 0), 0);
  if (used + incomingBytes > ACCOUNT_QUOTA_BYTES) {
    throw new ApiError("account_quota_exceeded", "Your private cloud storage quota is full.", 413);
  }
}

async function beginUpload(uid: string, request: Request) {
  const body = await readJsonBody(request);
  const allowedKeys = new Set(["fileName", "sizeBytes", "contentType", "checksumSha256", "documentId"]);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
    throw new ApiError("invalid_request_body", "Unexpected upload metadata was provided.");
  }
  const idempotencyKey = (request.headers.get("idempotency-key") || "").trim();
  const sizeBytes = Number(body.sizeBytes);
  const checksumSha256 = String(body.checksumSha256 || "").toLowerCase();
  const requestedDocumentId = String(body.documentId || "");
  if (idempotencyKey.length < 16 || idempotencyKey.length > 200) {
    throw new ApiError("invalid_request_body", "A valid idempotency key is required.");
  }
  if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_FILE_BYTES) {
    throw new ApiError("file_size_not_allowed", "The PDF exceeds the private cloud file limit.", 413);
  }
  if (body.contentType !== "application/pdf" || !CHECKSUM_PATTERN.test(checksumSha256)) {
    throw new ApiError("invalid_pdf", "Only a verified PDF can be saved.", 422);
  }
  if (requestedDocumentId && !DOCUMENT_ID_PATTERN.test(requestedDocumentId)) {
    throw new ApiError("invalid_request_body", "The document identifier is invalid.");
  }

  const idempotencyKeyHash = await sha256Text(`${uid}\u0000${idempotencyKey}`);
  const { data: replay, error: replayError } = await admin
    .from("private_cloud_upload_intents")
    .select("*")
    .eq("firebase_uid", uid)
    .eq("idempotency_key_hash", idempotencyKeyHash)
    .maybeSingle();
  if (replayError) throw new ApiError("cloud_unavailable", "Private cloud storage is temporarily unavailable.", 503);
  if (replay?.state === "failed") {
    await admin.storage.from(PRIVATE_BUCKET).remove([String(replay.storage_path)]);
    const { error: cleanupError } = await admin
      .from("private_cloud_upload_intents")
      .delete()
      .eq("upload_id", replay.upload_id)
      .eq("firebase_uid", uid)
      .eq("state", "failed");
    if (cleanupError) throw new ApiError("cloud_unavailable", "Private cloud storage is temporarily unavailable.", 503);
  } else if (replay) {
    return reuseUploadIntent(uid, replay);
  }

  if (requestedDocumentId) {
    const { data: owned, error } = await admin
      .from("private_cloud_documents")
      .select("id")
      .eq("id", requestedDocumentId)
      .eq("firebase_uid", uid)
      .maybeSingle();
    if (error || !owned) throw new ApiError("not_found", "That private cloud document is no longer available.", 404);
  }
  await enforceAccountQuota(uid, sizeBytes);

  const documentId = requestedDocumentId || opaqueId("doc");
  const versionId = opaqueId("ver");
  const uploadId = hex(randomBytes(32));
  const path = storagePath(uid, documentId, versionId);
  const displayName = sanitizePdfName(body.fileName);
  const { data: created, error: createError } = await admin
    .from("private_cloud_upload_intents")
    .insert({
      upload_id: uploadId,
      firebase_uid: uid,
      idempotency_key_hash: idempotencyKeyHash,
      document_id: documentId,
      version_id: versionId,
      storage_path: path,
      display_name: displayName,
      size_bytes: sizeBytes,
      checksum_sha256: checksumSha256,
      state: "uploading",
    })
    .select("*")
    .single();
  if (createError || !created) throw new ApiError("cloud_unavailable", "Private cloud storage is temporarily unavailable.", 503);
  return reuseUploadIntent(uid, created);
}

async function reuseUploadIntent(uid: string, intent: Record<string, unknown>) {
  if (intent.state === "active") {
    const { data: document, error } = await admin
      .from("private_cloud_documents")
      .select("*")
      .eq("id", intent.document_id)
      .eq("firebase_uid", uid)
      .single();
    if (error || !document) throw new ApiError("cloud_unavailable", "Private cloud storage is temporarily unavailable.", 503);
    return { ...publicDocument(document), state: "active", verified: true };
  }
  if (intent.state !== "uploading") throw new ApiError("invalid_pdf", "The previous upload was rejected.", 422);

  const present = await storageObjectPresent(String(intent.storage_path), Number(intent.size_bytes));
  if (present) {
    return {
      state: "ready_to_finalize",
      uploadId: intent.upload_id,
      documentId: intent.document_id,
      versionId: intent.version_id,
    };
  }
  const { data, error } = await admin.storage
    .from(PRIVATE_BUCKET)
    .createSignedUploadUrl(String(intent.storage_path));
  if (error || !data?.signedUrl) throw new ApiError("cloud_unavailable", "Private cloud storage is temporarily unavailable.", 503);
  return {
    state: "uploading",
    uploadId: intent.upload_id,
    documentId: intent.document_id,
    versionId: intent.version_id,
    uploadSessionUrl: new URL(data.signedUrl, supabaseUrl).toString(),
  };
}

async function finalizeUpload(uid: string, uploadId: string, request: Request) {
  const body = await readJsonBody(request);
  if (Object.keys(body).some((key) => key !== "checksumSha256")) {
    throw new ApiError("invalid_request_body", "Only the upload checksum is accepted.");
  }
  const checksum = String(body.checksumSha256 || "").toLowerCase();
  const idempotencyKey = (request.headers.get("idempotency-key") || "").trim();
  if (!CHECKSUM_PATTERN.test(checksum) || idempotencyKey.length < 16) {
    throw new ApiError("invalid_request_body", "The upload confirmation is invalid.");
  }
  const idempotencyKeyHash = await sha256Text(`${uid}\u0000${idempotencyKey}`);
  const { data: intent, error: intentError } = await admin
    .from("private_cloud_upload_intents")
    .select("*")
    .eq("upload_id", uploadId)
    .eq("firebase_uid", uid)
    .eq("idempotency_key_hash", idempotencyKeyHash)
    .maybeSingle();
  if (intentError || !intent) throw new ApiError("not_found", "That private upload is no longer available.", 404);
  if (intent.state === "active") return reuseUploadIntent(uid, intent);
  if (checksum !== intent.checksum_sha256) throw new ApiError("checksum_mismatch", "The uploaded PDF checksum did not match.", 422);

  const { data: blob, error: downloadError } = await admin.storage
    .from(PRIVATE_BUCKET)
    .download(String(intent.storage_path));
  if (downloadError || !blob) throw new ApiError("upload_incomplete", "The PDF upload did not finish.", 409);
  if (blob.size !== Number(intent.size_bytes)) {
    await admin.storage.from(PRIVATE_BUCKET).remove([String(intent.storage_path)]);
    throw new ApiError("upload_incomplete", "The PDF upload did not finish.", 409);
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const actualChecksum = await sha256Bytes(bytes);
  if (actualChecksum !== intent.checksum_sha256) {
    await admin.storage.from(PRIVATE_BUCKET).remove([String(intent.storage_path)]);
    await admin.from("private_cloud_upload_intents").update({ state: "failed", updated_at: new Date().toISOString() }).eq("upload_id", uploadId);
    throw new ApiError("checksum_mismatch", "The uploaded PDF checksum did not match.", 422);
  }
  let inspection;
  try {
    inspection = await inspectPdf(bytes);
  } catch (error) {
    await admin.storage.from(PRIVATE_BUCKET).remove([String(intent.storage_path)]);
    await admin.from("private_cloud_upload_intents").update({ state: "failed", updated_at: new Date().toISOString() }).eq("upload_id", uploadId);
    throw error;
  }

  const { data: activated, error: activationError } = await admin.rpc("activate_private_cloud_upload", {
    p_upload_id: uploadId,
    p_firebase_uid: uid,
    p_page_count: inspection.pageCount,
  });
  if (activationError || !activated) throw new ApiError("cloud_unavailable", "The private cloud save could not be confirmed.", 503);
  return activated;
}

async function getCloudHistory(uid: string) {
  const { data, error } = await admin.from("private_cloud_settings")
    .select("cloud_history_enabled")
    .eq("firebase_uid", uid)
    .maybeSingle();
  if (error) throw new ApiError("cloud_unavailable", "Private cloud storage is temporarily unavailable.", 503);
  return { enabled: data?.cloud_history_enabled === true };
}

async function setCloudHistory(uid: string, request: Request) {
  const body = await readJsonBody(request);
  if (Object.keys(body).length !== 1 || typeof body.enabled !== "boolean") {
    throw new ApiError("invalid_request_body", "A boolean cloud-history setting is required.");
  }
  const { data, error } = await admin.from("private_cloud_settings").upsert({
    firebase_uid: uid,
    cloud_history_enabled: body.enabled,
    updated_at: new Date().toISOString(),
  }).select("cloud_history_enabled").single();
  if (error || !data) throw new ApiError("cloud_unavailable", "Private cloud storage is temporarily unavailable.", 503);
  return { enabled: data.cloud_history_enabled === true };
}

async function listDocuments(uid: string, url: URL) {
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 100)));
  const cursor = url.searchParams.get("cursor") || "";
  const includeDeleted = url.searchParams.get("includeDeleted") === "true";
  if (!Number.isInteger(limit) || (cursor && !DOCUMENT_ID_PATTERN.test(cursor))) {
    throw new ApiError("invalid_request_body", "The document list request is invalid.");
  }
  let query = admin.from("private_cloud_documents")
    .select("*")
    .eq("firebase_uid", uid)
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (!includeDeleted) query = query.eq("state", "active");
  if (cursor) query = query.lt("id", cursor);
  const { data, error } = await query;
  if (error) throw new ApiError("cloud_unavailable", "Private cloud storage is temporarily unavailable.", 503);
  const rows = data || [];
  const page = rows.slice(0, limit);
  return {
    documents: page.map((record) => publicDocument(record)),
    nextCursor: rows.length > limit ? String(page.at(-1)?.id || "") : null,
  };
}

async function ownedDocument(uid: string, documentId: string) {
  const { data, error } = await admin.from("private_cloud_documents")
    .select("*")
    .eq("id", documentId)
    .eq("firebase_uid", uid)
    .maybeSingle();
  if (error || !data) throw new ApiError("not_found", "That private cloud document is no longer available.", 404);
  return data;
}

async function downloadDocument(uid: string, documentId: string, url: URL, origin: string) {
  const document = await ownedDocument(uid, documentId);
  if (document.state !== "active") throw new ApiError("not_found", "That private cloud document is no longer available.", 404);
  const versionId = url.searchParams.get("versionId") || String(document.current_version_id);
  if (!VERSION_ID_PATTERN.test(versionId)) throw new ApiError("invalid_request_body", "The document version is invalid.");
  const { data: version, error } = await admin.from("private_cloud_document_versions")
    .select("*")
    .eq("id", versionId)
    .eq("document_id", documentId)
    .eq("firebase_uid", uid)
    .maybeSingle();
  if (error || !version) throw new ApiError("not_found", "That private cloud version is no longer available.", 404);
  const { data: blob, error: downloadError } = await admin.storage.from(PRIVATE_BUCKET).download(version.storage_path);
  if (downloadError || !blob || blob.size !== Number(version.size_bytes)) {
    throw new ApiError("cloud_unavailable", "The private cloud download could not be verified.", 503);
  }
  const name = sanitizePdfName(document.display_name);
  return new Response(blob, {
    status: 200,
    headers: {
      ...securityHeaders(origin),
      "Content-Type": "application/pdf",
      "Content-Length": String(blob.size),
      "Content-Disposition": `attachment; filename="document.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
    },
  });
}

async function trashDocument(uid: string, documentId: string) {
  await ownedDocument(uid, documentId);
  const now = new Date().toISOString();
  const { error } = await admin.from("private_cloud_documents").update({
    state: "trashed",
    trashed_at: now,
    updated_at: now,
  }).eq("id", documentId).eq("firebase_uid", uid);
  if (error) throw new ApiError("cloud_unavailable", "The private cloud deletion could not be confirmed.", 503);
  return { documentId, state: "trashed", deleteConfirmed: true };
}

async function restoreDocument(uid: string, documentId: string) {
  const document = await ownedDocument(uid, documentId);
  const { data: version, error: versionError } = await admin.from("private_cloud_document_versions")
    .select("storage_path, size_bytes")
    .eq("id", document.current_version_id)
    .eq("firebase_uid", uid)
    .maybeSingle();
  if (versionError || !version || !(await storageObjectPresent(version.storage_path, Number(version.size_bytes)))) {
    throw new ApiError("not_found", "That private cloud version is no longer available.", 404);
  }
  const { error } = await admin.from("private_cloud_documents").update({
    state: "active",
    trashed_at: null,
    updated_at: new Date().toISOString(),
  }).eq("id", documentId).eq("firebase_uid", uid);
  if (error) throw new ApiError("cloud_unavailable", "The private cloud restore could not be confirmed.", 503);
  return { documentId, state: "active", restoreConfirmed: true };
}

async function restoreVersion(uid: string, documentId: string, versionId: string) {
  await ownedDocument(uid, documentId);
  const { data: version, error } = await admin.from("private_cloud_document_versions")
    .select("*")
    .eq("id", versionId)
    .eq("document_id", documentId)
    .eq("firebase_uid", uid)
    .maybeSingle();
  if (error || !version || !(await storageObjectPresent(version.storage_path, Number(version.size_bytes)))) {
    throw new ApiError("not_found", "That private cloud version is no longer available.", 404);
  }
  const { error: updateError } = await admin.from("private_cloud_documents").update({
    state: "active",
    current_version_id: versionId,
    size_bytes: version.size_bytes,
    checksum_sha256: version.checksum_sha256,
    page_count: version.page_count,
    trashed_at: null,
    updated_at: new Date().toISOString(),
  }).eq("id", documentId).eq("firebase_uid", uid);
  if (updateError) throw new ApiError("cloud_unavailable", "The private cloud restore could not be confirmed.", 503);
  return { documentId, versionId, state: "active", restoreConfirmed: true };
}

async function removeStoredPaths(paths: string[]) {
  if (!paths.length) return;
  for (let offset = 0; offset < paths.length; offset += 100) {
    const batch = paths.slice(offset, offset + 100);
    const { error } = await admin.storage.from(PRIVATE_BUCKET).remove(batch);
    if (error) throw new ApiError("cloud_unavailable", "Private cloud deletion is temporarily unavailable.", 503);
  }
  for (const path of paths) {
    if (await storageObjectPresent(path)) {
      throw new ApiError("cloud_unavailable", "Private cloud deletion could not be confirmed.", 503);
    }
  }
}

async function purgeDocument(uid: string, documentId: string) {
  await ownedDocument(uid, documentId);
  const [{ data: versions, error: versionError }, { data: uploads, error: uploadError }] = await Promise.all([
    admin.from("private_cloud_document_versions").select("storage_path").eq("firebase_uid", uid).eq("document_id", documentId),
    admin.from("private_cloud_upload_intents").select("storage_path").eq("firebase_uid", uid).eq("document_id", documentId),
  ]);
  if (versionError || uploadError) throw new ApiError("cloud_unavailable", "Private cloud deletion is temporarily unavailable.", 503);
  await removeStoredPaths([...new Set([...(versions || []), ...(uploads || [])].map((row) => row.storage_path))]);
  const { error: uploadsDeleteError } = await admin.from("private_cloud_upload_intents").delete().eq("firebase_uid", uid).eq("document_id", documentId);
  const { error: documentDeleteError } = await admin.from("private_cloud_documents").delete().eq("firebase_uid", uid).eq("id", documentId);
  if (uploadsDeleteError || documentDeleteError) throw new ApiError("cloud_unavailable", "Private cloud deletion could not be confirmed.", 503);
  const { count } = await admin.from("private_cloud_documents").select("id", { count: "exact", head: true }).eq("firebase_uid", uid).eq("id", documentId);
  if (count) throw new ApiError("cloud_unavailable", "Private cloud deletion could not be confirmed.", 503);
  return { documentId, state: "deleted", deleteConfirmed: true };
}

async function purgeAccount(uid: string, authTime: number) {
  if ((Date.now() / 1000) - authTime > RECENT_AUTH_SECONDS) {
    throw new ApiError("recent_authentication_required", "Sign in again before permanently deleting cloud data.", 401);
  }
  const [{ data: versions, error: versionError }, { data: uploads, error: uploadError }] = await Promise.all([
    admin.from("private_cloud_document_versions").select("storage_path").eq("firebase_uid", uid),
    admin.from("private_cloud_upload_intents").select("storage_path").eq("firebase_uid", uid),
  ]);
  if (versionError || uploadError) throw new ApiError("cloud_unavailable", "Private cloud deletion is temporarily unavailable.", 503);
  await removeStoredPaths([...new Set([...(versions || []), ...(uploads || [])].map((row) => row.storage_path))]);
  const deletions = await Promise.all([
    admin.from("private_cloud_upload_intents").delete().eq("firebase_uid", uid),
    admin.from("private_cloud_documents").delete().eq("firebase_uid", uid),
    admin.from("private_cloud_settings").delete().eq("firebase_uid", uid),
  ]);
  if (deletions.some(({ error }) => error)) throw new ApiError("cloud_unavailable", "Private cloud deletion could not be confirmed.", 503);
  const checks = await Promise.all([
    admin.from("private_cloud_documents").select("id", { count: "exact", head: true }).eq("firebase_uid", uid),
    admin.from("private_cloud_document_versions").select("id", { count: "exact", head: true }).eq("firebase_uid", uid),
    admin.from("private_cloud_upload_intents").select("upload_id", { count: "exact", head: true }).eq("firebase_uid", uid),
  ]);
  if (checks.some(({ count, error }) => error || count)) {
    throw new ApiError("cloud_unavailable", "Private cloud deletion could not be confirmed.", 503);
  }
  return { state: "complete", purgeConfirmed: true };
}

Deno.serve(async (request: Request) => {
  const requestOrigin = request.headers.get("origin") || "";
  try {
    const origin = requireAllowedOrigin(request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: securityHeaders(origin) });
    const identity = await verifyFirebaseIdentity(request);
    const path = routePath(request);
    const url = new URL(request.url);

    if (path === "/v1/cloud-history") {
      if (request.method === "GET") return jsonResponse({ ok: true, ...(await getCloudHistory(identity.uid)) }, 200, origin);
      assertMethod(request, "PUT");
      return jsonResponse({ ok: true, ...(await setCloudHistory(identity.uid, request)) }, 200, origin);
    }
    if (path === "/v1/documents/uploads") {
      assertMethod(request, "POST");
      return jsonResponse({ ok: true, ...(await beginUpload(identity.uid, request)) }, 201, origin);
    }
    const finalizeMatch = path.match(/^\/v1\/documents\/uploads\/([a-f0-9]{64})\/finalize$/);
    if (finalizeMatch) {
      assertMethod(request, "POST");
      return jsonResponse({ ok: true, ...(await finalizeUpload(identity.uid, finalizeMatch[1], request)) }, 200, origin);
    }
    if (path === "/v1/documents") {
      assertMethod(request, "GET");
      return jsonResponse({ ok: true, ...(await listDocuments(identity.uid, url)) }, 200, origin);
    }
    const downloadMatch = path.match(/^\/v1\/documents\/(doc_[A-Za-z0-9_-]{24})\/download$/);
    if (downloadMatch) {
      assertMethod(request, "GET");
      return downloadDocument(identity.uid, downloadMatch[1], url, origin);
    }
    const restoreVersionMatch = path.match(/^\/v1\/documents\/(doc_[A-Za-z0-9_-]{24})\/versions\/(ver_[A-Za-z0-9_-]{24})\/restore$/);
    if (restoreVersionMatch) {
      assertMethod(request, "POST");
      return jsonResponse({ ok: true, ...(await restoreVersion(identity.uid, restoreVersionMatch[1], restoreVersionMatch[2])) }, 200, origin);
    }
    const restoreMatch = path.match(/^\/v1\/documents\/(doc_[A-Za-z0-9_-]{24})\/restore$/);
    if (restoreMatch) {
      assertMethod(request, "POST");
      return jsonResponse({ ok: true, ...(await restoreDocument(identity.uid, restoreMatch[1])) }, 200, origin);
    }
    const documentMatch = path.match(/^\/v1\/documents\/(doc_[A-Za-z0-9_-]{24})$/);
    if (documentMatch) {
      assertMethod(request, "DELETE");
      const result = url.searchParams.get("permanent") === "true"
        ? await purgeDocument(identity.uid, documentMatch[1])
        : await trashDocument(identity.uid, documentMatch[1]);
      return jsonResponse({ ok: true, ...result }, 200, origin);
    }
    if (path === "/v1/account/data") {
      assertMethod(request, "DELETE");
      return jsonResponse({ ok: true, ...(await purgeAccount(identity.uid, identity.authTime)) }, 200, origin);
    }
    throw new ApiError("route_not_found", "The private cloud route was not found.", 404);
  } catch (error) {
    return safeErrorResponse(error, requestOrigin);
  }
});

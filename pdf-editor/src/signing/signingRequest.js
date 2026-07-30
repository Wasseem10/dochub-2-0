import { doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { hashShareToken, isValidShareToken } from "../sharing/securePdfSharing.js";

const REQUEST_VERSION = 1;
const FIELD_TYPES = new Set(["text", "signature", "initials", "date", "checkbox"]);
const COMPLETION_CHECKSUM_PATTERN = /^[a-f0-9]{64}$/;

function base64UrlEncode(bytes) {
  let binary = "";
  bytes.forEach((value) => { binary += String.fromCharCode(value); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const base64 = String(value || "").replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function cleanText(value, maximum = 160) {
  return Array.from(String(value || ""), (character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127 ? " " : character;
  }).join("").replace(/\s+/g, " ").trim().slice(0, maximum);
}

function boundedNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
}

export function normalizeSigningFields(fields) {
  return (fields || []).slice(0, 100).map((field, index) => ({
    id: cleanText(field.id || `field-${index + 1}`, 80),
    page: Math.max(0, Math.min(499, Math.floor(Number(field.page) || 0))),
    x: boundedNumber(field.x),
    y: boundedNumber(field.y),
    w: Math.max(0.02, boundedNumber(field.w, 0.24)),
    h: Math.max(0.018, boundedNumber(field.h, 0.055)),
    type: FIELD_TYPES.has(field.type) ? field.type : "text",
    label: cleanText(field.label || "Required field", 80),
    required: field.required !== false,
  }));
}

export function createSigningRequestPayload(input = {}) {
  const now = input.createdAt instanceof Date ? input.createdAt : new Date(input.createdAt || Date.now());
  const expires = input.expiresAt instanceof Date ? input.expiresAt : new Date(input.expiresAt || now.getTime() + 7 * 86400000);
  const payload = {
    version: REQUEST_VERSION,
    requestId: cleanText(input.requestId, 80),
    recipient: { name: cleanText(input.recipient?.name, 100), email: cleanText(input.recipient?.email, 160).toLowerCase() },
    requester: { name: cleanText(input.requester?.name, 100), email: cleanText(input.requester?.email, 160).toLowerCase() },
    message: cleanText(input.message, 500),
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    fields: normalizeSigningFields(input.fields),
  };
  if (!payload.requestId || !payload.fields.length) throw new Error("A signing request needs an ID and at least one field.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.recipient.email)) throw new Error("Enter a valid recipient email address.");
  return payload;
}

export function encodeSigningRequestPayload(payload) {
  return base64UrlEncode(new TextEncoder().encode(JSON.stringify(createSigningRequestPayload(payload))));
}

export function decodeSigningRequestPayload(value) {
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(value)));
    if (payload?.version !== REQUEST_VERSION) return null;
    return createSigningRequestPayload(payload);
  } catch {
    return null;
  }
}

export function signingRequestFromLocation(location = globalThis.location) {
  const hash = new URLSearchParams(String(location?.hash || "").replace(/^#/, ""));
  return decodeSigningRequestPayload(hash.get("request"));
}

export function signingRequestCapabilityFromLocation(location = globalThis.location) {
  const fragment = new URLSearchParams(String(location?.hash || "").replace(/^#/, ""));
  const fragmentToken = fragment.get("token") || "";
  const legacyRequest = decodeSigningRequestPayload(fragment.get("request"));
  if (isValidShareToken(fragmentToken)) {
    return { token: fragmentToken, legacyPath: false, legacyRequest };
  }
  const match = String(location?.pathname || "").match(/^\/sign\/([^/]+)\/?$/);
  if (!match) return { token: "", legacyPath: false, legacyRequest };
  try {
    const legacyToken = decodeURIComponent(match[1]);
    return {
      token: isValidShareToken(legacyToken) ? legacyToken : "",
      legacyPath: true,
      legacyRequest,
    };
  } catch {
    return { token: "", legacyPath: true, legacyRequest };
  }
}

export function createSigningRequestUrl({ origin, token }) {
  if (!isValidShareToken(token)) throw new Error("A valid signing token is required.");
  const fragment = new URLSearchParams({ token });
  return `${String(origin || "").replace(/\/$/, "")}/sign#${fragment.toString()}`;
}

function requestIdForHash(tokenHash) {
  return `request-${tokenHash.slice(0, 16)}`;
}

function timestampDate(value) {
  return value?.toDate?.() || new Date(value || 0);
}

export async function storeSigningRequest({ db, userId, token, payload }) {
  if (!db || !userId) throw new Error("Secure signing storage is not configured.");
  const tokenHash = await hashShareToken(token);
  const normalized = createSigningRequestPayload({
    ...payload,
    requestId: requestIdForHash(tokenHash),
  });
  const createdAt = new Date(normalized.createdAt);
  const expiresAt = new Date(normalized.expiresAt);
  await setDoc(doc(db, "signingRequests", tokenHash), {
    ownerId: userId,
    version: REQUEST_VERSION,
    requestId: normalized.requestId,
    recipient: normalized.recipient,
    requester: normalized.requester,
    message: normalized.message,
    fields: normalized.fields,
    status: "active",
    createdAt: Timestamp.fromDate(createdAt),
    expiresAt: Timestamp.fromDate(expiresAt),
  });
  return { tokenHash, request: normalized, expiresAt };
}

export async function loadSigningRequest({
  db,
  token,
  legacyRequest = null,
  now = new Date(),
}) {
  if (!db || !isValidShareToken(token)) return { status: "invalid" };
  const tokenHash = await hashShareToken(token);
  try {
    const snapshot = await getDoc(doc(db, "signingRequests", tokenHash));
    if (!snapshot.exists()) {
      if (!legacyRequest) return { status: "invalid" };
      const legacyExpiration = new Date(legacyRequest.expiresAt);
      return legacyExpiration.getTime() > now.getTime()
        ? { status: "ready", request: legacyRequest, legacy: true }
        : { status: "expired" };
    }
    const record = snapshot.data();
    const expiresAt = timestampDate(record.expiresAt);
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
      return { status: "expired" };
    }
    if (record.status !== "active") {
      return { status: record.status === "completed" ? "completed" : "invalid" };
    }
    const request = createSigningRequestPayload({
      requestId: record.requestId || requestIdForHash(tokenHash),
      recipient: record.recipient,
      requester: record.requester,
      message: record.message,
      fields: record.fields,
      createdAt: timestampDate(record.createdAt),
      expiresAt,
    });
    return { status: "ready", request, tokenHash, legacy: false };
  } catch (error) {
    if (error?.code === "permission-denied") return { status: "invalid" };
    throw error;
  }
}

export async function markSigningRequestCompleted({ db, token, checksum }) {
  if (!db || !isValidShareToken(token) || !COMPLETION_CHECKSUM_PATTERN.test(String(checksum || ""))) {
    throw new Error("The signing completion record is invalid.");
  }
  const tokenHash = await hashShareToken(token);
  await updateDoc(doc(db, "signingRequests", tokenHash), {
    status: "completed",
    completedAt: serverTimestamp(),
    completionChecksum: checksum,
  });
}

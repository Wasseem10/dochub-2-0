const REQUEST_VERSION = 1;
const FIELD_TYPES = new Set(["text", "signature", "initials", "date", "checkbox"]);

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

export function createSigningRequestUrl({ origin, token, payload }) {
  const encoded = encodeSigningRequestPayload(payload);
  return `${String(origin || "").replace(/\/$/, "")}/sign/${encodeURIComponent(token)}#request=${encoded}`;
}

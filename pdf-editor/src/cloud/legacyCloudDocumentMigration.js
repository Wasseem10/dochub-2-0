import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { deleteObject, getBytes, ref as storageReference } from "firebase/storage";
import { sanitizePdfDisplayName } from "../tools/safeFileName.js";

const LEGACY_MAX_PAYLOAD_BYTES = 70 * 1024 * 1024;
const LEGACY_MAX_PDF_BYTES = 50 * 1024 * 1024;
const LEGACY_MAX_PAGES = 500;
const LEGACY_MAX_ANNOTATIONS = 10_000;
const LEGACY_MAX_DETECTED_TEXT_ITEMS = 25_000;
const LEGACY_DOCUMENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,160}$/;
const LEGACY_RECORD_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,180}$/;
const SAFE_IMAGE_DATA_URL = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/;
const BLOCKED_OBJECT_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const LEGACY_ANNOTATION_TYPES = new Set([
  "text", "signature", "initials", "checkbox", "field", "date", "draw", "highlight",
  "whiteout", "rectangle", "circle", "line", "arrow", "comment", "stamp", "link", "image",
]);

function requireLegacyIdentity(userId, documentId) {
  const ownerId = String(userId || "");
  const recordId = String(documentId || "");
  if (!ownerId || ownerId.includes("/") || !LEGACY_DOCUMENT_ID_PATTERN.test(recordId)) {
    throw new Error("The older cloud document identifier is invalid.");
  }
  return { ownerId, recordId };
}

export function legacyCloudPayloadPath(userId, documentId) {
  const { ownerId, recordId } = requireLegacyIdentity(userId, documentId);
  return `users/${ownerId}/documents/${recordId}/document.json`;
}

export function normalizeLegacyCloudMetadata(userId, documentId, metadata = {}) {
  const expectedPath = legacyCloudPayloadPath(userId, documentId);
  if (metadata.ownerId !== userId || metadata.payloadPath !== expectedPath) return null;
  return {
    id: documentId,
    ownerId: userId,
    name: sanitizePdfDisplayName(metadata.name || "Older cloud document.pdf"),
    size: Math.max(0, Number(metadata.size || 0)),
    source: metadata.source === "blank" ? "blank" : "pdf",
    pageCount: Math.max(1, Number(metadata.pageCount || 1)),
    status: "Older cloud copy",
    location: "Migration",
    favorite: Boolean(metadata.favorite),
    uploadedAt: metadata.uploadedAt || metadata.updatedAt || new Date(0).toISOString(),
    updatedAt: metadata.updatedAt || metadata.uploadedAt || new Date(0).toISOString(),
    pages: [],
    annotations: [],
    detectedTextItems: [],
    legacyCloudDocumentId: documentId,
    legacyCloudPayloadPath: expectedPath,
    cloudOnly: true,
  };
}

function safeDate(value) {
  const date = new Date(value || 0);
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date(0).toISOString();
}

function safeNumber(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback;
}

function safeLink(value) {
  const candidate = String(value || "").trim().slice(0, 2_048);
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function sanitizeLegacyValue(value, key = "", depth = 0) {
  if (depth > 4 || value == null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    if (/^(?:image|imageDataUrl)$/i.test(key)) {
      return value.length <= 12 * 1024 * 1024 && SAFE_IMAGE_DATA_URL.test(value) ? value : "";
    }
    if (/^(?:href|url|link)$/i.test(key)) return safeLink(value);
    return Array.from(value, (character) => character.charCodeAt(0) < 32 && !/\s/.test(character) ? " " : character)
      .join("")
      .slice(0, 250_000);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 25_000).map((entry) => sanitizeLegacyValue(entry, key, depth + 1));
  }
  if (typeof value === "object") {
    const result = {};
    Object.entries(value).slice(0, 100).forEach(([entryKey, entryValue]) => {
      if (BLOCKED_OBJECT_KEYS.has(entryKey)) return;
      result[entryKey] = sanitizeLegacyValue(entryValue, entryKey, depth + 1);
    });
    return result;
  }
  return null;
}

function validateLegacyPdfDataUrl(value) {
  const candidate = String(value || "");
  const match = candidate.match(/^data:application\/pdf;base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) throw new Error("The older cloud PDF payload is invalid.");
  const encoded = match[1].replace(/\s+/g, "");
  if (!encoded || Math.floor((encoded.length * 3) / 4) > LEGACY_MAX_PDF_BYTES) {
    throw new Error("The older cloud PDF exceeds the migration limit.");
  }
  let binary;
  try {
    binary = atob(encoded);
  } catch {
    throw new Error("The older cloud PDF payload is invalid.");
  }
  if (!binary.startsWith("%PDF-") || !/%%EOF\s*$/.test(binary.slice(-2_048))) {
    throw new Error("The older cloud PDF failed signature validation.");
  }
  return { dataUrl: candidate, byteLength: binary.length };
}

export function normalizeLegacyCloudPayload({ payload, userId, documentId, expectedPath }) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || payload.id !== documentId) {
    throw new Error("The older cloud document failed identity validation.");
  }
  if (payload.ownerId && payload.ownerId !== userId) {
    throw new Error("The older cloud document is unavailable.");
  }
  if (payload.cloudPayloadPath && payload.cloudPayloadPath !== expectedPath) {
    throw new Error("The older cloud document path is invalid.");
  }
  const source = payload.source === "blank" ? "blank" : "pdf";
  const pages = Array.isArray(payload.pages)
    ? payload.pages.slice(0, LEGACY_MAX_PAGES).map((page, index) => ({
      ...sanitizeLegacyValue(page),
      id: LEGACY_RECORD_ID_PATTERN.test(String(page?.id || "")) ? String(page.id) : `legacy-page-${index + 1}`,
      number: index + 1,
      originalIndex: page?.originalIndex == null
        ? source === "pdf" ? index : null
        : Math.floor(safeNumber(page.originalIndex, index, 0, LEGACY_MAX_PAGES - 1)),
      width: safeNumber(page?.width, 612, 1, 20_000),
      height: safeNumber(page?.height, 792, 1, 20_000),
      source: ["pdf", "blank", "image"].includes(page?.source) ? page.source : source,
    }))
    : [];
  if (!pages.length || Number(payload.pageCount || pages.length) !== pages.length) {
    throw new Error("The older cloud document page data is invalid.");
  }

  let pdfDataUrl = "";
  let size = 0;
  if (source === "pdf") {
    const validatedPdf = validateLegacyPdfDataUrl(payload.pdfDataUrl);
    pdfDataUrl = validatedPdf.dataUrl;
    size = validatedPdf.byteLength;
  }
  const annotations = Array.isArray(payload.annotations)
    ? payload.annotations
      .slice(0, LEGACY_MAX_ANNOTATIONS)
      .filter((record) => record && typeof record === "object" && LEGACY_ANNOTATION_TYPES.has(record.type))
      .map((record, index) => ({
        ...sanitizeLegacyValue(record),
        id: LEGACY_RECORD_ID_PATTERN.test(String(record.id || "")) ? String(record.id) : `legacy-annotation-${index + 1}`,
        type: record.type,
        page: Math.floor(safeNumber(record.page, 0, 0, pages.length - 1)),
      }))
    : [];
  const detectedTextItems = Array.isArray(payload.detectedTextItems)
    ? payload.detectedTextItems
      .slice(0, LEGACY_MAX_DETECTED_TEXT_ITEMS)
      .filter((record) => record && typeof record === "object")
      .map((record, index) => ({
        ...sanitizeLegacyValue(record),
        id: LEGACY_RECORD_ID_PATTERN.test(String(record.id || "")) ? String(record.id) : `legacy-text-${index + 1}`,
        pageNumber: Math.floor(safeNumber(record.pageNumber, 0, 0, pages.length - 1)),
      }))
    : [];
  return {
    id: documentId,
    ownerId: userId,
    name: sanitizePdfDisplayName(payload.name || "Older cloud document.pdf"),
    size,
    source,
    pageCount: pages.length,
    status: "Ready",
    location: "My documents",
    favorite: Boolean(payload.favorite),
    uploadedAt: safeDate(payload.uploadedAt),
    updatedAt: safeDate(payload.updatedAt || payload.uploadedAt),
    pdfDataUrl,
    pages,
    annotations,
    detectedTextItems,
    legacyCloudDocumentId: documentId,
    legacyCloudPayloadPath: expectedPath,
    cloudOnly: false,
  };
}

export async function listLegacyCloudDocuments({ db, userId }) {
  if (!db || !userId) return [];
  const snapshot = await getDocs(collection(db, "users", userId, "documents"));
  return snapshot.docs
    .map((item) => normalizeLegacyCloudMetadata(userId, item.id, item.data()))
    .filter(Boolean);
}

export async function loadLegacyCloudDocument({ storage, userId, documentId }) {
  if (!storage) throw new Error("Older cloud document storage is unavailable.");
  const expectedPath = legacyCloudPayloadPath(userId, documentId);
  const buffer = await getBytes(storageReference(storage, expectedPath), LEGACY_MAX_PAYLOAD_BYTES);
  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer)));
  } catch {
    throw new Error("The older cloud document could not be read safely.");
  }
  return normalizeLegacyCloudPayload({ payload, userId, documentId, expectedPath });
}

export async function deleteLegacyCloudDocument({ db, storage, userId, documentId }) {
  if (!db || !storage) throw new Error("Older cloud document deletion is unavailable.");
  const expectedPath = legacyCloudPayloadPath(userId, documentId);
  try {
    await deleteObject(storageReference(storage, expectedPath));
  } catch (error) {
    if (error?.code !== "storage/object-not-found") throw error;
  }
  await deleteDoc(doc(db, "users", userId, "documents", documentId));
}

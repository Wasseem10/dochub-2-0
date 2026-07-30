export const EDITOR_SIGNATURE_LIBRARY_KEY = "pdfenrich.signature-library.v1";
export const MAX_SAVED_EDITOR_SIGNATURES = 3;
const LEGACY_GUEST_OWNER_ID = "realpdf-local-guest";

function ownerStorageSuffix(ownerId) {
  return encodeURIComponent(String(ownerId || ""));
}

export function editorSignatureLibraryKey(ownerId = "") {
  return ownerId
    ? `${EDITOR_SIGNATURE_LIBRARY_KEY}.${ownerStorageSuffix(ownerId)}`
    : EDITOR_SIGNATURE_LIBRARY_KEY;
}

export function canSaveEditorSignature({ mode = "signature", tab = "draw", typedName = "", hasInk = false, uploadedImage = "" } = {}) {
  if (mode === "initials") return Boolean(String(typedName).trim());
  if (tab === "draw") return Boolean(hasInk);
  if (tab === "type") return Boolean(String(typedName).trim());
  if (tab === "upload") return Boolean(uploadedImage);
  return false;
}

export function normalizeEditorSignature(signature = {}) {
  const content = String(signature.content || "").trim();
  const imageDataUrl = typeof signature.imageDataUrl === "string" ? signature.imageDataUrl : "";
  if (!content && !imageDataUrl) return null;
  return {
    id: String(signature.id || ""),
    content: content || "Signature",
    imageDataUrl,
    fontFamily: String(signature.fontFamily || ""),
    createdAt: String(signature.createdAt || ""),
  };
}

export function upsertSavedEditorSignature(signatures = [], signature = {}, createId = () => `signature-${Date.now().toString(36)}`) {
  const normalized = normalizeEditorSignature(signature);
  if (!normalized) return signatures.map(normalizeEditorSignature).filter(Boolean).slice(0, MAX_SAVED_EDITOR_SIGNATURES);
  const existing = signatures.map(normalizeEditorSignature).filter(Boolean);
  const duplicate = existing.find((item) => (
    item.imageDataUrl === normalized.imageDataUrl
    && item.content === normalized.content
    && item.fontFamily === normalized.fontFamily
  ));
  const saved = {
    ...normalized,
    id: normalized.id || duplicate?.id || createId(),
    createdAt: normalized.createdAt || duplicate?.createdAt || new Date().toISOString(),
  };
  return [saved, ...existing.filter((item) => item.id !== saved.id)].slice(0, MAX_SAVED_EDITOR_SIGNATURES);
}

export function removeSavedEditorSignature(signatures = [], signatureId = "") {
  return signatures.map(normalizeEditorSignature).filter((item) => item && item.id !== signatureId);
}

export function loadEditorSignatureLibrary(
  storage = typeof window !== "undefined" ? window.localStorage : null,
  ownerId = "",
) {
  if (!storage) return [];
  try {
    const storageKey = editorSignatureLibraryKey(ownerId);
    let serialized = storage.getItem(storageKey);
    if (!serialized && ownerId === LEGACY_GUEST_OWNER_ID) {
      serialized = storage.getItem(EDITOR_SIGNATURE_LIBRARY_KEY);
      if (serialized) storage.setItem(storageKey, serialized);
    }
    const parsed = JSON.parse(serialized || "[]");
    return Array.isArray(parsed) ? parsed.map(normalizeEditorSignature).filter(Boolean).slice(0, MAX_SAVED_EDITOR_SIGNATURES) : [];
  } catch {
    return [];
  }
}

export function persistEditorSignatureLibrary(
  signatures = [],
  storage = typeof window !== "undefined" ? window.localStorage : null,
  ownerId = "",
) {
  if (!storage) return;
  const normalized = signatures.map(normalizeEditorSignature).filter(Boolean).slice(0, MAX_SAVED_EDITOR_SIGNATURES);
  try {
    storage.setItem(editorSignatureLibraryKey(ownerId), JSON.stringify(normalized));
  } catch {
    // A full or restricted browser storage area should not block signing.
  }
}

export function clearEditorSignatureLibrary(
  storage = typeof window !== "undefined" ? window.localStorage : null,
  ownerId = "",
) {
  if (!storage) return true;
  try {
    storage.removeItem(editorSignatureLibraryKey(ownerId));
    return storage.getItem(editorSignatureLibraryKey(ownerId)) == null;
  } catch {
    // The account-deletion caller must surface incomplete browser cleanup.
    return false;
  }
}

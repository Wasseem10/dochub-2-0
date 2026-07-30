import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch } from "firebase/firestore";
import { deleteObject, getBytes, ref as storageReference, uploadBytes } from "firebase/storage";

export const SECURE_SHARE_LIMITS = Object.freeze({
  maxBytes: 25 * 1024 * 1024,
  expirationDays: Object.freeze([1, 7, 30]),
});

const TOKEN_BYTES = 24;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;
const TOKEN_HASH_PATTERN = /^[a-f0-9]{64}$/;
const SOURCE_DOCUMENT_ID_PATTERN = /^doc_[A-Za-z0-9_-]{24}$/;

function requireCloudServices(db, storage, storageRequired = true) {
  if (!db || (storageRequired && !storage)) throw new Error("Secure sharing is not configured for this deployment.");
}

export function createShareToken(cryptoApi = globalThis.crypto) {
  if (!cryptoApi?.getRandomValues) throw new Error("Secure random link generation is unavailable in this browser.");
  const bytes = cryptoApi.getRandomValues(new Uint8Array(TOKEN_BYTES));
  const binary = Array.from(bytes, (value) => String.fromCharCode(value)).join("");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

export function isValidShareToken(token) {
  return TOKEN_PATTERN.test(String(token || ""));
}

export function isValidShareTokenHash(tokenHash) {
  return TOKEN_HASH_PATTERN.test(String(tokenHash || ""));
}

export function normalizeShareSourceDocumentId(sourceDocumentId) {
  const normalized = String(sourceDocumentId || "").trim();
  return SOURCE_DOCUMENT_ID_PATTERN.test(normalized) ? normalized : "";
}

export async function hashShareToken(token, cryptoApi = globalThis.crypto) {
  if (!isValidShareToken(token)) throw new Error("A valid sharing token is required.");
  if (!cryptoApi?.subtle?.digest) throw new Error("Secure token hashing is unavailable in this browser.");
  const digest = await cryptoApi.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

export function shareTokenFromLocation(location = globalThis.location) {
  const fragment = new URLSearchParams(String(location?.hash || "").replace(/^#/, ""));
  const fragmentToken = fragment.get("token") || "";
  if (isValidShareToken(fragmentToken)) return { token: fragmentToken, legacyPath: false };
  const match = String(location?.pathname || "").match(/^\/share\/([^/]+)\/?$/);
  if (!match) return { token: "", legacyPath: false };
  try {
    const legacyToken = decodeURIComponent(match[1]);
    return isValidShareToken(legacyToken)
      ? { token: legacyToken, legacyPath: true }
      : { token: "", legacyPath: true };
  } catch {
    return { token: "", legacyPath: true };
  }
}

export function normalizeExpirationDays(value) {
  const days = Number(value);
  return SECURE_SHARE_LIMITS.expirationDays.includes(days) ? days : 7;
}

export function isShareRecordAccessible(record, now = new Date()) {
  const hasStoredPdf = typeof record?.storagePath === "string"
    || (Number.isInteger(record?.chunkCount) && record.chunkCount > 0);
  if (!record || record.status !== "active" || !hasStoredPdf) return false;
  const expiration = record.expiresAt?.toDate?.() || new Date(record.expiresAt || 0);
  return Number.isFinite(expiration.getTime()) && expiration.getTime() > now.getTime();
}

function safePdfName(fileName) {
  const withoutControls = Array.from(String(fileName || "shared-document.pdf"), (character) => character.charCodeAt(0) < 32 ? "-" : character).join("");
  const cleaned = withoutControls
    .replace(/[<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return /\.pdf$/i.test(cleaned) ? cleaned : `${cleaned || "shared-document"}.pdf`;
}

export function secureShareStoragePath(tokenHash) {
  if (!isValidShareTokenHash(tokenHash)) throw new Error("A valid sharing token hash is required.");
  return `shares/${tokenHash}/document.pdf`;
}

export async function createSecurePdfShare({
  db,
  storage,
  userId,
  pdfBlob,
  fileName,
  expirationDays = 7,
  sourceDocumentId = "",
  now = new Date(),
}) {
  requireCloudServices(db, storage);
  if (!userId) throw new Error("Sign in before creating a sharing link.");
  if (!(pdfBlob instanceof Blob) || pdfBlob.type !== "application/pdf") throw new Error("Only PDF files can be shared.");
  if (!pdfBlob.size || pdfBlob.size > SECURE_SHARE_LIMITS.maxBytes) throw new Error("Shared PDFs must be between 1 byte and 25 MB.");

  const token = createShareToken();
  const tokenHash = await hashShareToken(token);
  const days = normalizeExpirationDays(expirationDays);
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const shareRef = doc(db, "shareLinks", tokenHash);
  const name = safePdfName(fileName);
  const storagePath = secureShareStoragePath(tokenHash);
  const normalizedSourceDocumentId = normalizeShareSourceDocumentId(sourceDocumentId);

  await setDoc(shareRef, {
    ownerId: userId,
    ...(normalizedSourceDocumentId ? { sourceDocumentId: normalizedSourceDocumentId } : {}),
    fileName: name,
    size: pdfBlob.size,
    contentType: "application/pdf",
    storagePath,
    status: "uploading",
    allowDownload: true,
    createdAt: Timestamp.fromDate(now),
    expiresAt: Timestamp.fromDate(expiresAt),
  });

  try {
    await uploadBytes(storageReference(storage, storagePath), pdfBlob, {
      contentType: "application/pdf",
      customMetadata: { ownerId: userId, tokenHash },
    });
    await updateDoc(shareRef, { status: "active" });
  } catch (error) {
    try {
      await deleteObject(storageReference(storage, storagePath));
    } catch (cleanupError) {
      if (cleanupError?.code !== "storage/object-not-found") {
        // The inaccessible uploading record remains as the owner/object
        // association so account cleanup can retry without orphaning bytes.
      }
    }
    await updateDoc(shareRef, {
      status: "revoked",
      revokedAt: serverTimestamp(),
    }).catch(() => {});
    throw error;
  }

  return { token, tokenHash, fileName: name, size: pdfBlob.size, storagePath, expiresAt };
}

export async function loadSecurePdfShare({ db, storage, token, now = new Date() }) {
  requireCloudServices(db, storage, false);
  if (!isValidShareToken(token)) return { status: "invalid" };

  try {
    const tokenHash = await hashShareToken(token);
    let recordId = tokenHash;
    let snapshot = await getDoc(doc(db, "shareLinks", recordId));
    if (!snapshot.exists()) {
      // Temporary read bridge for links created before bearer tokens were
      // removed from Firestore document IDs and object paths.
      recordId = token;
      snapshot = await getDoc(doc(db, "shareLinks", recordId));
    }
    if (!snapshot.exists()) return { status: "invalid" };
    const record = snapshot.data();
    if (!isShareRecordAccessible(record, now)) return { status: "expired" };
    if (record.storagePath) {
      const expectedPath = recordId === tokenHash
        ? secureShareStoragePath(tokenHash)
        : `shares/${token}/document.pdf`;
      if (!storage || record.storagePath !== expectedPath) return { status: "invalid" };
      const buffer = await getBytes(storageReference(storage, record.storagePath), SECURE_SHARE_LIMITS.maxBytes);
      const bytes = new Uint8Array(buffer);
      if (!bytes.byteLength || bytes.byteLength !== Number(record.size)) return { status: "invalid" };
      return {
        status: "ready",
        blob: new Blob([bytes], { type: "application/pdf" }),
        fileName: safePdfName(record.fileName),
        size: bytes.byteLength,
        expiresAt: record.expiresAt?.toDate?.() || new Date(record.expiresAt),
        allowDownload: record.allowDownload !== false,
      };
    }

    // Legacy shares stored file chunks in Firestore. Keep them readable until they expire.
    if (recordId !== token) return { status: "invalid" };
    const chunkSnapshot = await getDocs(query(collection(db, "shareLinks", token, "chunks"), orderBy("index")));
    if (chunkSnapshot.docs.length !== record.chunkCount) return { status: "invalid" };
    const chunks = chunkSnapshot.docs.map((chunk) => chunk.data().data?.toUint8Array?.()).filter(Boolean);
    if (chunks.length !== record.chunkCount) return { status: "invalid" };
    const byteLength = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
    if (!byteLength || byteLength > SECURE_SHARE_LIMITS.maxBytes || byteLength !== Number(record.size)) return { status: "invalid" };
    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    chunks.forEach((chunk) => { bytes.set(chunk, offset); offset += chunk.byteLength; });
    return {
      status: "ready",
      blob: new Blob([bytes], { type: "application/pdf" }),
      fileName: safePdfName(record.fileName),
      size: byteLength,
      expiresAt: record.expiresAt?.toDate?.() || new Date(record.expiresAt),
      allowDownload: record.allowDownload !== false,
    };
  } catch (error) {
    if (error?.code === "permission-denied") {
      return { status: "invalid" };
    }
    throw error;
  }
}

export async function revokeSecurePdfShare({ db, storage, userId, token }) {
  requireCloudServices(db, storage, false);
  if (!userId || !isValidShareToken(token)) throw new Error("This sharing link cannot be revoked.");
  const tokenHash = await hashShareToken(token);
  let recordId = tokenHash;
  let shareRef = doc(db, "shareLinks", recordId);
  let snapshot = await getDoc(shareRef);
  if (!snapshot.exists()) {
    recordId = token;
    shareRef = doc(db, "shareLinks", recordId);
    snapshot = await getDoc(shareRef);
  }
  if (!snapshot.exists() || snapshot.data().ownerId !== userId) throw new Error("You do not own this sharing link.");
  const record = snapshot.data();
  if (record.status !== "revoked") {
    await updateDoc(shareRef, {
      status: "revoked",
      revokedAt: serverTimestamp(),
    });
  }
  if (record.storagePath) {
    if (!storage) throw new Error("Secure sharing storage is unavailable.");
    try {
      await deleteObject(storageReference(storage, record.storagePath));
    } catch (error) {
      if (error?.code !== "storage/object-not-found") {
        throw new Error("The shared PDF deletion was not confirmed.");
      }
    }
  }
  const chunkSnapshot = recordId === token
    ? await getDocs(collection(db, "shareLinks", token, "chunks"))
    : { docs: [] };
  if (chunkSnapshot.docs.length) {
    const deletion = writeBatch(db);
    chunkSnapshot.docs.forEach((chunk) => deletion.delete(chunk.ref));
    await deletion.commit();
  }
  const signingRequestRef = doc(db, "signingRequests", tokenHash);
  const signingRequestSnapshot = await getDoc(signingRequestRef);
  const deletion = writeBatch(db);
  if (signingRequestSnapshot.exists()) {
    if (signingRequestSnapshot.data().ownerId !== userId) {
      throw new Error("You do not own the related signing request.");
    }
    deletion.delete(signingRequestRef);
  }
  await deletion.commit();
  return { state: "revoked", revokeConfirmed: true };
}

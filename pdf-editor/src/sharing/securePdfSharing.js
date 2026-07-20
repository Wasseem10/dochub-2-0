import { deleteDoc, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { deleteObject, getBytes, ref, uploadBytes } from "firebase/storage";

export const SECURE_SHARE_LIMITS = Object.freeze({
  maxBytes: 25 * 1024 * 1024,
  expirationDays: Object.freeze([1, 7, 30]),
});

const TOKEN_BYTES = 24;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

function requireCloudServices(db, storage) {
  if (!db || !storage) throw new Error("Secure sharing is not configured for this deployment.");
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

export function normalizeExpirationDays(value) {
  const days = Number(value);
  return SECURE_SHARE_LIMITS.expirationDays.includes(days) ? days : 7;
}

export function isShareRecordAccessible(record, now = new Date()) {
  if (!record || record.status !== "active" || !record.storagePath) return false;
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

export async function createSecurePdfShare({ db, storage, userId, pdfBlob, fileName, expirationDays = 7, now = new Date() }) {
  requireCloudServices(db, storage);
  if (!userId) throw new Error("Sign in before creating a sharing link.");
  if (!(pdfBlob instanceof Blob) || pdfBlob.type !== "application/pdf") throw new Error("Only PDF files can be shared.");
  if (!pdfBlob.size || pdfBlob.size > SECURE_SHARE_LIMITS.maxBytes) throw new Error("Shared PDFs must be between 1 byte and 25 MB.");

  const token = createShareToken();
  const days = normalizeExpirationDays(expirationDays);
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const storagePath = `shares/${userId}/${token}/document.pdf`;
  const shareRef = doc(db, "shareLinks", token);
  const objectRef = ref(storage, storagePath);
  const name = safePdfName(fileName);

  await uploadBytes(objectRef, pdfBlob, {
    contentType: "application/pdf",
    customMetadata: { ownerId: userId, shareToken: token },
  });

  try {
    await setDoc(shareRef, {
      ownerId: userId,
      fileName: name,
      size: pdfBlob.size,
      storagePath,
      status: "active",
      allowDownload: true,
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expiresAt),
    });
  } catch (error) {
    await deleteObject(objectRef).catch(() => {});
    throw error;
  }

  return { token, fileName: name, size: pdfBlob.size, storagePath, expiresAt };
}

export async function loadSecurePdfShare({ db, storage, token, now = new Date() }) {
  requireCloudServices(db, storage);
  if (!isValidShareToken(token)) return { status: "invalid" };

  try {
    const snapshot = await getDoc(doc(db, "shareLinks", token));
    if (!snapshot.exists()) return { status: "invalid" };
    const record = snapshot.data();
    if (!isShareRecordAccessible(record, now)) return { status: "expired" };
    const bytes = await getBytes(ref(storage, record.storagePath), SECURE_SHARE_LIMITS.maxBytes);
    return {
      status: "ready",
      blob: new Blob([bytes], { type: "application/pdf" }),
      fileName: safePdfName(record.fileName),
      size: Number(record.size || bytes.byteLength),
      expiresAt: record.expiresAt?.toDate?.() || new Date(record.expiresAt),
      allowDownload: record.allowDownload !== false,
    };
  } catch (error) {
    if (["storage/object-not-found", "storage/unauthorized", "permission-denied"].includes(error?.code)) {
      return { status: "invalid" };
    }
    throw error;
  }
}

export async function revokeSecurePdfShare({ db, storage, userId, token }) {
  requireCloudServices(db, storage);
  if (!userId || !isValidShareToken(token)) throw new Error("This sharing link cannot be revoked.");
  const shareRef = doc(db, "shareLinks", token);
  const snapshot = await getDoc(shareRef);
  if (!snapshot.exists() || snapshot.data().ownerId !== userId) throw new Error("You do not own this sharing link.");
  const storagePath = snapshot.data().storagePath;
  await deleteDoc(shareRef);
  if (storagePath) await deleteObject(ref(storage, storagePath)).catch(() => {});
}

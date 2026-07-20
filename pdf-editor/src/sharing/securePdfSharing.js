import { Bytes, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc, Timestamp, updateDoc, writeBatch } from "firebase/firestore";

export const SECURE_SHARE_LIMITS = Object.freeze({
  maxBytes: 25 * 1024 * 1024,
  expirationDays: Object.freeze([1, 7, 30]),
});

const TOKEN_BYTES = 24;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;
const SHARE_CHUNK_BYTES = 500 * 1024;

function requireCloudServices(db) {
  if (!db) throw new Error("Secure sharing is not configured for this deployment.");
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
  if (!record || record.status !== "active" || !Number.isInteger(record.chunkCount) || record.chunkCount < 1) return false;
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

export async function createSecurePdfShare({ db, userId, pdfBlob, fileName, expirationDays = 7, now = new Date() }) {
  requireCloudServices(db);
  if (!userId) throw new Error("Sign in before creating a sharing link.");
  if (!(pdfBlob instanceof Blob) || pdfBlob.type !== "application/pdf") throw new Error("Only PDF files can be shared.");
  if (!pdfBlob.size || pdfBlob.size > SECURE_SHARE_LIMITS.maxBytes) throw new Error("Shared PDFs must be between 1 byte and 25 MB.");

  const token = createShareToken();
  const days = normalizeExpirationDays(expirationDays);
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const shareRef = doc(db, "shareLinks", token);
  const name = safePdfName(fileName);
  const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
  const chunkCount = Math.ceil(bytes.byteLength / SHARE_CHUNK_BYTES);

  await setDoc(shareRef, {
    ownerId: userId,
    fileName: name,
    size: pdfBlob.size,
    contentType: "application/pdf",
    chunkCount,
    status: "uploading",
    allowDownload: true,
    createdAt: Timestamp.fromDate(now),
    expiresAt: Timestamp.fromDate(expiresAt),
  });

  try {
    for (let index = 0; index < chunkCount; index += 1) {
      const start = index * SHARE_CHUNK_BYTES;
      const data = Bytes.fromUint8Array(bytes.slice(start, start + SHARE_CHUNK_BYTES));
      await setDoc(doc(db, "shareLinks", token, "chunks", String(index).padStart(3, "0")), { index, data });
    }
    await updateDoc(shareRef, { status: "active" });
  } catch (error) {
    const chunkSnapshot = await getDocs(collection(db, "shareLinks", token, "chunks")).catch(() => null);
    if (chunkSnapshot?.docs.length) {
      const cleanup = writeBatch(db);
      chunkSnapshot.docs.forEach((chunk) => cleanup.delete(chunk.ref));
      await cleanup.commit().catch(() => {});
    }
    await deleteDoc(shareRef).catch(() => {});
    throw error;
  }

  return { token, fileName: name, size: pdfBlob.size, chunkCount, expiresAt };
}

export async function loadSecurePdfShare({ db, token, now = new Date() }) {
  requireCloudServices(db);
  if (!isValidShareToken(token)) return { status: "invalid" };

  try {
    const snapshot = await getDoc(doc(db, "shareLinks", token));
    if (!snapshot.exists()) return { status: "invalid" };
    const record = snapshot.data();
    if (!isShareRecordAccessible(record, now)) return { status: "expired" };
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

export async function revokeSecurePdfShare({ db, userId, token }) {
  requireCloudServices(db);
  if (!userId || !isValidShareToken(token)) throw new Error("This sharing link cannot be revoked.");
  const shareRef = doc(db, "shareLinks", token);
  const snapshot = await getDoc(shareRef);
  if (!snapshot.exists() || snapshot.data().ownerId !== userId) throw new Error("You do not own this sharing link.");
  const chunkSnapshot = await getDocs(collection(db, "shareLinks", token, "chunks"));
  if (chunkSnapshot.docs.length) {
    const deletion = writeBatch(db);
    chunkSnapshot.docs.forEach((chunk) => deletion.delete(chunk.ref));
    await deletion.commit();
  }
  await deleteDoc(shareRef);
}

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { deleteObject, getBytes, ref as storageReference, uploadBytes } from "firebase/storage";
import { createShareToken } from "../sharing/securePdfSharing.js";
import { normalizeSigningFields } from "./signingRequest.js";

export const SIGNATURE_REQUEST_LIMITS = Object.freeze({
  maxBytes: 25 * 1024 * 1024,
  maxRecipients: 10,
  expirationDays: Object.freeze([1, 7, 15, 30]),
});

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value, maximum = 160) {
  return Array.from(String(value || ""), (character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127 ? " " : character;
  }).join("").replace(/\s+/g, " ").trim().slice(0, maximum);
}

function safePdfName(fileName) {
  const cleaned = cleanText(fileName || "signature-request.pdf", 124)
    .replace(/[<>:"/\\|?*]+/g, "-")
    .trim();
  return /\.pdf$/i.test(cleaned) ? cleaned : `${cleaned || "signature-request"}.pdf`;
}

function normalizeEmail(value) {
  return cleanText(value, 160).toLowerCase();
}

function requireServices(db, storage, needsStorage = true) {
  if (!db || (needsStorage && !storage)) throw new Error("Cloud signature requests are not configured for this deployment.");
}

function requireToken(value, label) {
  const token = String(value || "");
  if (!TOKEN_PATTERN.test(token)) throw new Error(`A valid ${label} is required.`);
  return token;
}

function normalizeExpirationDays(value) {
  const days = Number(value);
  return SIGNATURE_REQUEST_LIMITS.expirationDays.includes(days) ? days : 7;
}

function normalizeRecipient(recipient, index) {
  const email = normalizeEmail(recipient?.email);
  if (!EMAIL_PATTERN.test(email)) throw new Error(`Enter a valid email for recipient ${index + 1}.`);
  const fields = normalizeSigningFields(recipient?.fields);
  if (!fields.length) throw new Error(`Assign at least one field to ${recipient?.name || email}.`);
  return {
    inviteId: createShareToken(),
    name: cleanText(recipient?.name || email.split("@")[0], 100),
    email,
    order: index,
    fields,
  };
}

export function signatureRequestStoragePath(requestId) {
  return `signatureRequests/${requireToken(requestId, "request ID")}/current.pdf`;
}

export function signatureSubmissionStoragePath(requestId, inviteId) {
  return `signatureRequests/${requireToken(requestId, "request ID")}/submissions/${requireToken(inviteId, "invite ID")}`;
}

function isValidRequestStoragePath(requestId, storagePath) {
  return storagePath === signatureRequestStoragePath(requestId)
    || new RegExp(`^signatureRequests/${requestId}/submissions/[A-Za-z0-9_-]{32}$`).test(String(storagePath || ""));
}

export function signatureInvitationFromLocation(location = globalThis.location) {
  const requestId = String(location?.pathname || "").split("/").filter(Boolean).at(-1) || "";
  const inviteId = new URLSearchParams(String(location?.hash || "").replace(/^#/, "")).get("invite") || "";
  return TOKEN_PATTERN.test(requestId) && TOKEN_PATTERN.test(inviteId) ? { requestId, inviteId } : null;
}

export function createSignatureInvitationUrl({ origin, requestId, inviteId }) {
  return `${String(origin || "").replace(/\/$/, "")}/sign/${encodeURIComponent(requireToken(requestId, "request ID"))}#invite=${encodeURIComponent(requireToken(inviteId, "invite ID"))}`;
}

export function hasVerifiedSigningIdentity(user, expectedEmail = "") {
  if (!user?.uid || !user?.providers?.includes("google.com")) return false;
  return !expectedEmail || normalizeEmail(user.email) === normalizeEmail(expectedEmail);
}

export async function sha256Hex(value) {
  const bytes = value instanceof Uint8Array
    ? value
    : value instanceof Blob
      ? new Uint8Array(await value.arrayBuffer())
      : new Uint8Array(value || []);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createCloudSignatureRequest({
  db,
  storage,
  user,
  pdfBlob,
  fileName,
  recipients,
  message = "",
  expirationDays = 7,
  origin = globalThis.location?.origin,
  now = new Date(),
}) {
  requireServices(db, storage);
  if (!user?.uid || !user?.email) throw new Error("Sign in before creating a signature request.");
  if (!(pdfBlob instanceof Blob) || pdfBlob.type !== "application/pdf") throw new Error("Only PDF documents can be sent for signature.");
  if (!pdfBlob.size || pdfBlob.size > SIGNATURE_REQUEST_LIMITS.maxBytes) throw new Error("Signature requests support PDFs up to 25 MB.");
  if (!Array.isArray(recipients) || !recipients.length || recipients.length > SIGNATURE_REQUEST_LIMITS.maxRecipients) {
    throw new Error(`Add between 1 and ${SIGNATURE_REQUEST_LIMITS.maxRecipients} recipients.`);
  }

  const normalizedRecipients = recipients.map(normalizeRecipient);
  const duplicateEmail = normalizedRecipients.find((recipient, index) => normalizedRecipients.findIndex((item) => item.email === recipient.email) !== index);
  if (duplicateEmail) throw new Error(`${duplicateEmail.email} is listed more than once.`);

  const requestId = createShareToken();
  const storagePath = signatureRequestStoragePath(requestId);
  const days = normalizeExpirationDays(expirationDays);
  const expiresAt = new Date(now.getTime() + days * 86400000);
  const initialFingerprint = await sha256Hex(pdfBlob);
  const requestRef = doc(db, "signatureRequests", requestId);
  const first = normalizedRecipients[0];
  const name = safePdfName(fileName);
  const rootRecord = {
    ownerId: user.uid,
    ownerName: cleanText(user.name || user.email, 100),
    ownerEmail: normalizeEmail(user.email),
    fileName: name,
    size: pdfBlob.size,
    contentType: "application/pdf",
    storagePath,
    status: "uploading",
    recipientCount: normalizedRecipients.length,
    currentOrder: 0,
    currentInviteId: first.inviteId,
    currentRecipientEmail: first.email,
    message: cleanText(message, 500),
    sourceFingerprint: initialFingerprint,
    currentFingerprint: initialFingerprint,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
    expiresAt: Timestamp.fromDate(expiresAt),
  };

  await setDoc(requestRef, rootRecord);
  try {
    await uploadBytes(storageReference(storage, storagePath), pdfBlob, {
      contentType: "application/pdf",
      customMetadata: { ownerId: user.uid, requestId },
    });
    const batch = writeBatch(db);
    normalizedRecipients.forEach((recipient, index) => {
      const nextInviteId = normalizedRecipients[index + 1]?.inviteId || "";
      const previousInviteId = normalizedRecipients[index - 1]?.inviteId || "";
      const nextEmail = normalizedRecipients[index + 1]?.email || "";
      const nextOrder = normalizedRecipients[index + 1]?.order ?? -1;
      batch.set(doc(db, "signatureRequests", requestId, "recipients", recipient.inviteId), {
        ownerId: user.uid,
        requestId,
        inviteId: recipient.inviteId,
        name: recipient.name,
        email: recipient.email,
        order: recipient.order,
        previousInviteId,
        nextInviteId,
        nextEmail,
        nextOrder,
        status: index === 0 ? "active" : "waiting",
        fields: recipient.fields,
        reminderCount: 0,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });
    });
    batch.update(requestRef, { status: "active", updatedAt: serverTimestamp() });
    await batch.commit();
  } catch (error) {
    await deleteObject(storageReference(storage, storagePath)).catch(() => {});
    await deleteDoc(requestRef).catch(() => {});
    throw error;
  }

  return {
    requestId,
    fileName: name,
    expiresAt,
    recipients: normalizedRecipients.map((recipient) => ({
      ...recipient,
      url: createSignatureInvitationUrl({ origin, requestId, inviteId: recipient.inviteId }),
    })),
  };
}

export async function loadSignatureInvitation({ db, storage, requestId, inviteId, user, now = new Date() }) {
  requireServices(db, storage, false);
  requireToken(requestId, "request ID");
  requireToken(inviteId, "invite ID");
  if (!hasVerifiedSigningIdentity(user)) return { status: "authentication-required" };

  try {
    const requestRef = doc(db, "signatureRequests", requestId);
    const recipientRef = doc(db, "signatureRequests", requestId, "recipients", inviteId);
    const [requestSnapshot, recipientSnapshot] = await Promise.all([getDoc(requestRef), getDoc(recipientRef)]);
    if (!requestSnapshot.exists() || !recipientSnapshot.exists()) return { status: "invalid" };
    const request = requestSnapshot.data();
    const recipient = recipientSnapshot.data();
    if (!hasVerifiedSigningIdentity(user, recipient.email)) return { status: "wrong-account" };
    const expiresAt = recipient.expiresAt?.toDate?.() || request.expiresAt?.toDate?.() || new Date(request.expiresAt || 0);
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= now || request.status === "revoked") return { status: "expired" };
    if (recipient.status === "completed") return { status: "completed", request, recipient, expiresAt };
    if (recipient.status !== "active" || request.status !== "active" || request.currentInviteId !== inviteId) {
      return { status: "waiting", request, recipient, expiresAt };
    }
    if (!storage || !isValidRequestStoragePath(requestId, request.storagePath)) return { status: "invalid" };
    const buffer = await getBytes(storageReference(storage, request.storagePath), SIGNATURE_REQUEST_LIMITS.maxBytes);
    const bytes = new Uint8Array(buffer);
    if (!bytes.byteLength || bytes.byteLength !== Number(request.size)) return { status: "invalid" };
    return { status: "ready", request, recipient, expiresAt, bytes, blob: new Blob([bytes], { type: "application/pdf" }) };
  } catch (error) {
    if (error?.code === "permission-denied") return { status: "wrong-account" };
    throw error;
  }
}

export function planSignatureRequestAdvance({ request, recipient, outputFingerprint, size }) {
  if (!request || !recipient || request.currentInviteId !== recipient.inviteId || recipient.status !== "active") {
    throw new Error("This signing step is not currently active.");
  }
  if (!/^[a-f0-9]{64}$/.test(outputFingerprint)) throw new Error("The completed PDF fingerprint is invalid.");
  if (!Number.isInteger(size) || size < 1 || size > SIGNATURE_REQUEST_LIMITS.maxBytes) throw new Error("The completed PDF size is invalid.");
  if (recipient.nextInviteId) {
    if (!TOKEN_PATTERN.test(recipient.nextInviteId) || !EMAIL_PATTERN.test(recipient.nextEmail) || recipient.nextOrder !== recipient.order + 1) {
      throw new Error("The next signing step is invalid.");
    }
    return {
      completed: false,
      nextInviteId: recipient.nextInviteId,
      rootPatch: {
        currentOrder: recipient.nextOrder,
        currentInviteId: recipient.nextInviteId,
        currentRecipientEmail: recipient.nextEmail,
        currentFingerprint: outputFingerprint,
        size,
      },
    };
  }
  return {
    completed: true,
    nextInviteId: "",
    rootPatch: {
      status: "completed",
      currentInviteId: "",
      currentRecipientEmail: "",
      currentFingerprint: outputFingerprint,
      finalFingerprint: outputFingerprint,
      size,
    },
  };
}

export async function completeSignatureInvitation({ db, storage, requestId, inviteId, user, signedBlob, sourceFingerprint, outputFingerprint }) {
  requireServices(db, storage);
  requireToken(requestId, "request ID");
  requireToken(inviteId, "invite ID");
  if (!hasVerifiedSigningIdentity(user)) throw new Error("Use the invited Google account to finish signing.");
  if (!(signedBlob instanceof Blob) || signedBlob.type !== "application/pdf" || !signedBlob.size || signedBlob.size > SIGNATURE_REQUEST_LIMITS.maxBytes) {
    throw new Error("The completed PDF is invalid or larger than 25 MB.");
  }
  if (!/^[a-f0-9]{64}$/.test(sourceFingerprint) || !/^[a-f0-9]{64}$/.test(outputFingerprint)) throw new Error("The document fingerprint could not be verified.");

  const requestRef = doc(db, "signatureRequests", requestId);
  const recipientRef = doc(db, "signatureRequests", requestId, "recipients", inviteId);
  const [requestSnapshot, recipientSnapshot] = await Promise.all([getDoc(requestRef), getDoc(recipientRef)]);
  if (!requestSnapshot.exists() || !recipientSnapshot.exists()) throw new Error("This signing request no longer exists.");
  const request = requestSnapshot.data();
  const recipient = recipientSnapshot.data();
  if (!hasVerifiedSigningIdentity(user, recipient.email)) throw new Error("This invitation belongs to a different email address.");
  if (request.status !== "active" || request.currentInviteId !== inviteId || recipient.status !== "active") throw new Error("This signing step is not currently active.");
  if (request.currentFingerprint !== sourceFingerprint) throw new Error("The document changed after this signing step was opened. Refresh and try again.");
  const advance = planSignatureRequestAdvance({ request, recipient, outputFingerprint, size: signedBlob.size });
  const submissionPath = signatureSubmissionStoragePath(requestId, inviteId);
  await uploadBytes(storageReference(storage, submissionPath), signedBlob, {
    contentType: "application/pdf",
    customMetadata: { ownerId: request.ownerId, requestId, inviteId },
  });

  const batch = writeBatch(db);
  batch.update(recipientRef, {
    status: "completed",
    signedAt: serverTimestamp(),
    consentedAt: serverTimestamp(),
    consentVersion: "electronic-signature-v1",
    updatedAt: serverTimestamp(),
    authenticatedEmail: normalizeEmail(user.email),
    sourceFingerprint,
    outputFingerprint,
  });

  if (!advance.completed) {
    const nextRef = doc(db, "signatureRequests", requestId, "recipients", advance.nextInviteId);
    batch.update(nextRef, { status: "active", updatedAt: serverTimestamp() });
    batch.update(requestRef, {
      ...advance.rootPatch,
      storagePath: submissionPath,
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.update(requestRef, {
      ...advance.rootPatch,
      storagePath: submissionPath,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  try {
    await batch.commit();
  } catch (error) {
    await deleteObject(storageReference(storage, submissionPath)).catch(() => {});
    throw error;
  }
  return { completed: advance.completed, fingerprint: outputFingerprint };
}

export async function listOwnedSignatureRequests({ db, userId }) {
  requireServices(db, null, false);
  if (!userId) return [];
  const snapshot = await getDocs(query(collection(db, "signatureRequests"), where("ownerId", "==", userId)));
  return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })).sort((a, b) => {
    const left = a.createdAt?.toMillis?.() || 0;
    const right = b.createdAt?.toMillis?.() || 0;
    return right - left;
  });
}

export async function getOwnedSignatureRequest({ db, userId, requestId }) {
  requireServices(db, null, false);
  requireToken(requestId, "request ID");
  const requestSnapshot = await getDoc(doc(db, "signatureRequests", requestId));
  if (!requestSnapshot.exists() || requestSnapshot.data().ownerId !== userId) throw new Error("You do not own this signature request.");
  const recipientSnapshot = await getDocs(collection(db, "signatureRequests", requestId, "recipients"));
  return {
    id: requestId,
    ...requestSnapshot.data(),
    recipients: recipientSnapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })).sort((a, b) => a.order - b.order),
  };
}

export async function downloadSignatureRequestPdf({ db, storage, userId, requestId }) {
  requireServices(db, storage);
  const request = await getOwnedSignatureRequest({ db, userId, requestId });
  if (!isValidRequestStoragePath(requestId, request.storagePath)) throw new Error("The request PDF path is invalid.");
  const buffer = await getBytes(storageReference(storage, request.storagePath), SIGNATURE_REQUEST_LIMITS.maxBytes);
  return { request, blob: new Blob([buffer], { type: "application/pdf" }) };
}

export async function revokeCloudSignatureRequest({ db, storage, userId, requestId }) {
  requireServices(db, storage);
  const request = await getOwnedSignatureRequest({ db, userId, requestId });
  if (!["active", "uploading"].includes(request.status)) return request;
  await updateDoc(doc(db, "signatureRequests", requestId), { status: "revoked", updatedAt: serverTimestamp() });
  const paths = new Set([
    request.storagePath,
    signatureRequestStoragePath(requestId),
    ...request.recipients.map((recipient) => signatureSubmissionStoragePath(requestId, recipient.id)),
  ].filter(Boolean));
  for (const path of paths) await deleteObject(storageReference(storage, path)).catch(() => {});
  return { ...request, status: "revoked" };
}

export async function deleteCloudSignatureRequest({ db, storage, userId, requestId }) {
  requireServices(db, storage);
  const request = await getOwnedSignatureRequest({ db, userId, requestId });
  const paths = new Set([
    request.storagePath,
    signatureRequestStoragePath(requestId),
    ...request.recipients.map((recipient) => signatureSubmissionStoragePath(requestId, recipient.id)),
  ].filter(Boolean));
  for (const path of paths) await deleteObject(storageReference(storage, path)).catch(() => {});
  const batch = writeBatch(db);
  request.recipients.forEach((recipient) => batch.delete(doc(db, "signatureRequests", requestId, "recipients", recipient.id)));
  batch.delete(doc(db, "signatureRequests", requestId));
  await batch.commit();
}

export async function recordSignatureReminder({ db, userId, requestId, inviteId }) {
  requireServices(db, null, false);
  const request = await getOwnedSignatureRequest({ db, userId, requestId });
  const recipient = request.recipients.find((item) => item.id === inviteId);
  if (!recipient || recipient.status === "completed") throw new Error("This recipient does not need a reminder.");
  await updateDoc(doc(db, "signatureRequests", requestId, "recipients", inviteId), {
    reminderCount: increment(1),
    lastReminderAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return recipient;
}

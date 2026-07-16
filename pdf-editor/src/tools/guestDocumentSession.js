import { loadLocalDocuments, saveLocalDocuments } from "./localDocumentStore.js";

export const GUEST_OWNER_ID = "realpdf-local-guest";
export const ACCOUNT_GATED_EDITOR_ACTIONS = Object.freeze(["save", "download"]);

export function editorActionNeedsAccount(action, currentUser) {
  return ACCOUNT_GATED_EDITOR_ACTIONS.includes(action) && !currentUser?.uid;
}

export function resolveEditorStorageOwnerId(isPublicEditor, currentUser) {
  return isPublicEditor ? GUEST_OWNER_ID : currentUser?.uid || GUEST_OWNER_ID;
}

export async function claimGuestDocument(userId, documentId, {
  loadDocuments = loadLocalDocuments,
  saveDocuments = saveLocalDocuments,
  now = () => new Date().toISOString(),
} = {}) {
  if (!userId || !documentId) return null;
  const guestDocuments = await loadDocuments(GUEST_OWNER_ID);
  const guestDocument = guestDocuments.find((documentRecord) => documentRecord.id === documentId);
  if (!guestDocument) return null;
  const userDocuments = await loadDocuments(userId);
  const claimedDocument = {
    ...guestDocument,
    ownerId: userId,
    updatedAt: now(),
  };
  await saveDocuments(userId, [claimedDocument, ...userDocuments.filter((documentRecord) => documentRecord.id !== documentId)]);
  await saveDocuments(GUEST_OWNER_ID, guestDocuments.filter((documentRecord) => documentRecord.id !== documentId));
  return claimedDocument;
}

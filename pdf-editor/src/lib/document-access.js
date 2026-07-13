export const GUEST_SESSION_KEY = "realpdf.guestOwner.v1";

function createGuestId() {
  if (globalThis.crypto?.randomUUID) return `guest-${globalThis.crypto.randomUUID()}`;
  return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getOrCreateGuestOwnerId(storage = globalThis.localStorage) {
  try {
    const existing = storage?.getItem(GUEST_SESSION_KEY);
    if (existing) return existing;
    const next = createGuestId();
    storage?.setItem(GUEST_SESSION_KEY, next);
    return next;
  } catch {
    return createGuestId();
  }
}

export function migrateLegacyGuestDocuments(documents, guestOwnerId) {
  return (Array.isArray(documents) ? documents : []).map((documentRecord) => (
    documentRecord?.ownerUid || documentRecord?.guestOwnerId
      ? documentRecord
      : { ...documentRecord, guestOwnerId }
  ));
}

export function viewerIdentity(currentUser, guestOwnerId) {
  return currentUser?.uid
    ? { uid: currentUser.uid, guestOwnerId: null }
    : { uid: null, guestOwnerId };
}

export function canAccessDocument(documentRecord, viewer) {
  if (!documentRecord?.id || !viewer) return false;
  if (viewer.uid) return documentRecord.ownerUid === viewer.uid;
  return !documentRecord.ownerUid
    && Boolean(viewer.guestOwnerId)
    && documentRecord.guestOwnerId === viewer.guestOwnerId;
}

export function documentsForViewer(documents, viewer) {
  return (Array.isArray(documents) ? documents : []).filter((documentRecord) => canAccessDocument(documentRecord, viewer));
}

export function ownershipForViewer(viewer) {
  return viewer?.uid
    ? { ownerUid: viewer.uid, guestOwnerId: null }
    : { ownerUid: null, guestOwnerId: viewer?.guestOwnerId || null };
}

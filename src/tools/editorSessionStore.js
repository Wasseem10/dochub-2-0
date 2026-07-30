// Keep the existing local database identifier so returning users retain drafts.
const DATABASE_NAME = "fixthatpdf-editor-sessions";
const DATABASE_VERSION = 1;
const STORE_NAME = "sessions";

const memorySessions = new Map();

function sessionStorageKey(documentId, ownerId = "") {
  if (!ownerId) return documentId;
  return `${encodeURIComponent(ownerId)}:${documentId}`;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error("IndexedDB is unavailable."));
      return;
    }
    const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error || new Error("Could not open editor session storage."));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "documentId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("Editor session storage failed."));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Editor session storage failed."));
    transaction.onabort = () => reject(transaction.error || new Error("Editor session storage was interrupted."));
  });
}

export async function saveEditorSession(documentId, snapshot) {
  if (!documentId) return false;
  const ownerId = String(snapshot?.ownerId || "");
  const storageKey = sessionStorageKey(documentId, ownerId);
  const session = {
    ...snapshot,
    documentId: storageKey,
    sourceDocumentId: documentId,
    ownerId,
    updatedAt: snapshot?.updatedAt || new Date().toISOString(),
  };
  memorySessions.set(storageKey, session);
  if (!globalThis.indexedDB) return false;

  try {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(session);
      await transactionDone(transaction);
    } finally {
      database.close();
    }
    return true;
  } catch {
    return false;
  }
}

export async function loadEditorSession(documentId, ownerId = "") {
  if (!documentId) return null;
  const storageKey = sessionStorageKey(documentId, ownerId);
  if (memorySessions.has(storageKey)) {
    const session = memorySessions.get(storageKey);
    return { ...session, documentId: session.sourceDocumentId || documentId };
  }
  if (!globalThis.indexedDB) return null;

  try {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const session = await requestResult(transaction.objectStore(STORE_NAME).get(storageKey));
      if (!session || String(session.ownerId || "") !== String(ownerId || "")) return null;
      memorySessions.set(storageKey, session);
      return { ...session, documentId: session.sourceDocumentId || documentId };
    } finally {
      database.close();
    }
  } catch {
    return null;
  }
}

export async function clearEditorSession(documentId, ownerId = "") {
  if (!documentId) return true;
  const storageKey = sessionStorageKey(documentId, ownerId);
  memorySessions.delete(storageKey);
  if (!globalThis.indexedDB) return true;

  try {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(storageKey);
      await transactionDone(transaction);
    } finally {
      database.close();
    }
    return true;
  } catch {
    // The in-memory session is already cleared; IndexedDB cleanup can retry later.
    return false;
  }
}

export function clearEditorSessionMemory() {
  memorySessions.clear();
}

export async function clearAllEditorSessions() {
  memorySessions.clear();
  if (!globalThis.indexedDB) return true;
  try {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).clear();
      await transactionDone(transaction);
    } finally {
      database.close();
    }
    return true;
  } catch {
    // Browser cleanup can be retried; this does not imply cloud deletion.
    return false;
  }
}

export async function clearEditorSessionsForOwner(ownerId) {
  if (!ownerId) return true;
  for (const [documentId, session] of memorySessions.entries()) {
    if (session?.ownerId === ownerId) memorySessions.delete(documentId);
  }
  if (!globalThis.indexedDB) return true;
  try {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const cursorRequest = store.openCursor();
      await new Promise((resolve, reject) => {
        cursorRequest.onerror = () => reject(cursorRequest.error || new Error("Editor session cleanup failed."));
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor) {
            resolve();
            return;
          }
          if (cursor.value?.ownerId === ownerId) cursor.delete();
          cursor.continue();
        };
      });
      await transactionDone(transaction);
    } finally {
      database.close();
    }
    return true;
  } catch {
    // Browser cleanup can be retried; this does not imply cloud deletion.
    return false;
  }
}

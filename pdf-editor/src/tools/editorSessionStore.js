const DATABASE_NAME = "fixthatpdf-editor-sessions";
const DATABASE_VERSION = 1;
const STORE_NAME = "sessions";

const memorySessions = new Map();

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
  const session = { ...snapshot, documentId, updatedAt: snapshot?.updatedAt || new Date().toISOString() };
  memorySessions.set(documentId, session);
  if (!globalThis.indexedDB) return true;

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
    return true;
  }
}

export async function loadEditorSession(documentId) {
  if (!documentId) return null;
  if (memorySessions.has(documentId)) return memorySessions.get(documentId);
  if (!globalThis.indexedDB) return null;

  try {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const session = await requestResult(transaction.objectStore(STORE_NAME).get(documentId));
      if (session) memorySessions.set(documentId, session);
      return session;
    } finally {
      database.close();
    }
  } catch {
    return null;
  }
}

export async function clearEditorSession(documentId) {
  if (!documentId) return;
  memorySessions.delete(documentId);
  if (!globalThis.indexedDB) return;

  try {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(documentId);
      await transactionDone(transaction);
    } finally {
      database.close();
    }
  } catch {
    // The in-memory session is already cleared; IndexedDB cleanup can retry later.
  }
}

export function clearEditorSessionMemory() {
  memorySessions.clear();
}

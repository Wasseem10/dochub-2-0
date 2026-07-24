const DATABASE_NAME = "realpdf-local-workspace";
const DATABASE_VERSION = 1;
const STORE_NAME = "documents";

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error("IndexedDB is unavailable."));
      return;
    }
    const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error || new Error("Could not open local document storage."));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "storageKey" });
        store.createIndex("ownerId", "ownerId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Local document storage failed."));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Local document storage failed."));
    transaction.onabort = () => reject(transaction.error || new Error("Local document storage was interrupted."));
  });
}

export async function loadLocalDocuments(ownerId) {
  if (!ownerId) return [];
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const index = transaction.objectStore(STORE_NAME).index("ownerId");
    const records = await requestResult(index.getAll(ownerId));
    return records
      .map(({ storageKey: _storageKey, ...documentRecord }) => documentRecord)
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  } finally {
    database.close();
  }
}

export async function saveLocalDocuments(ownerId, documents) {
  if (!ownerId) throw new Error("A local owner ID is required.");
  const database = await openDatabase();
  try {
    const existing = await loadLocalDocuments(ownerId);
    const nextIds = new Set(documents.map((documentRecord) => documentRecord.id));
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    existing.forEach((documentRecord) => {
      if (!nextIds.has(documentRecord.id)) store.delete(`${ownerId}:${documentRecord.id}`);
    });
    documents.forEach((documentRecord) => store.put({ ...documentRecord, ownerId, storageKey: `${ownerId}:${documentRecord.id}` }));
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

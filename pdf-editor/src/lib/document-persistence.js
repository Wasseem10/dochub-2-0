export const DOCUMENT_SCHEMA_VERSION = 1;

export class DocumentPersistenceError extends Error {
  constructor(message, code = "persistence-failed") {
    super(message);
    this.name = "DocumentPersistenceError";
    this.code = code;
  }
}

export function readDocumentCollection(storage, key) {
  try {
    const parsed = JSON.parse(storage?.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeDocumentCollection(storage, key, documents) {
  try {
    storage?.setItem(key, JSON.stringify(documents));
    return documents;
  } catch (error) {
    throw new DocumentPersistenceError(
      "RealPDF could not save this document in browser storage. Free some space, then retry.",
      error?.name === "QuotaExceededError" ? "storage-full" : "persistence-failed",
    );
  }
}

export function saveDocumentRevision({
  storedDocuments,
  stateDocuments,
  documentId,
  expectedRevision,
  updates,
}) {
  const stored = (storedDocuments || []).find((item) => item.id === documentId);
  const current = (stateDocuments || []).find((item) => item.id === documentId);
  if (!current) {
    throw new DocumentPersistenceError("This document is no longer available.", "document-missing");
  }

  const diskRevision = Number(stored?.revision || 0);
  const expected = Number(expectedRevision || 0);
  if (stored && diskRevision !== expected) {
    throw new DocumentPersistenceError(
      "A newer version of this document was saved in another tab. Reopen it before continuing.",
      "revision-conflict",
    );
  }

  const nextRecord = {
    ...current,
    ...updates,
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    revision: expected + 1,
  };
  const stateIds = new Set((stateDocuments || []).map((item) => item.id));
  const unrelatedStored = (storedDocuments || []).filter((item) => !stateIds.has(item.id));
  const nextDocuments = [
    ...(stateDocuments || []).map((item) => (item.id === documentId ? nextRecord : item)),
    ...unrelatedStored,
  ];

  return { nextRecord, nextDocuments };
}

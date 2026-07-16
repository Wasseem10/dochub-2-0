/**
 * @typedef {{ id: string, ownerId?: string, [key: string]: unknown }} EditorDocumentRecord
 */

/**
 * Resolve a document route without leaking another account's document payload.
 * @param {{ documentId?: string, documents: EditorDocumentRecord[], userId?: string, catalogReady: boolean }} options
 */
export function resolveEditorDocument({ documentId, documents, userId, catalogReady }) {
  if (!documentId) return { status: "not-found", document: null };
  const documentRecord = documents.find((item) => item.id === documentId) || null;
  if (!documentRecord) {
    return { status: catalogReady ? "not-found" : "loading", document: null };
  }
  const expectedOwnerId = userId || "guest";
  if (documentRecord.ownerId && documentRecord.ownerId !== expectedOwnerId) {
    return { status: "unauthorized", document: null };
  }
  return { status: "ready", document: documentRecord };
}

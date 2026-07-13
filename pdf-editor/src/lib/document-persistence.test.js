import { describe, expect, it } from "vitest";
import { DocumentPersistenceError, readDocumentCollection, saveDocumentRevision, writeDocumentCollection } from "./document-persistence.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe("document persistence", () => {
  it("round-trips a collection", () => {
    const storage = memoryStorage();
    writeDocumentCollection(storage, "docs", [{ id: "one" }]);
    expect(readDocumentCollection(storage, "docs")).toEqual([{ id: "one" }]);
  });

  it("surfaces storage failures instead of reporting success", () => {
    const storage = { setItem: () => { throw Object.assign(new Error("full"), { name: "QuotaExceededError" }); } };
    expect(() => writeDocumentCollection(storage, "docs", [])).toThrowError(DocumentPersistenceError);
    try {
      writeDocumentCollection(storage, "docs", []);
    } catch (error) {
      expect(error.code).toBe("storage-full");
    }
  });

  it("increments a document revision on save", () => {
    const documentRecord = { id: "one", revision: 2, annotations: [] };
    const result = saveDocumentRevision({
      storedDocuments: [documentRecord],
      stateDocuments: [documentRecord],
      documentId: "one",
      expectedRevision: 2,
      updates: { annotations: [{ id: "edit" }] },
    });
    expect(result.nextRecord.revision).toBe(3);
    expect(result.nextRecord.annotations).toHaveLength(1);
  });

  it("rejects stale writes from another tab", () => {
    const stored = { id: "one", revision: 3 };
    const state = { id: "one", revision: 2 };
    expect(() => saveDocumentRevision({
      storedDocuments: [stored],
      stateDocuments: [state],
      documentId: "one",
      expectedRevision: 2,
      updates: {},
    })).toThrowError(/newer version/i);
  });
});

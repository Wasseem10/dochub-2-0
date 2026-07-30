import { describe, expect, it } from "vitest";
import {
  canSaveEditorSignature,
  clearEditorSignatureLibrary,
  editorSignatureLibraryKey,
  EDITOR_SIGNATURE_LIBRARY_KEY,
  loadEditorSignatureLibrary,
  persistEditorSignatureLibrary,
  removeSavedEditorSignature,
  upsertSavedEditorSignature,
} from "../../src/tools/editorSignature.js";

describe("editor signature validation", () => {
  it("keeps empty signature actions disabled for every creation method", () => {
    expect(canSaveEditorSignature({ tab: "draw" })).toBe(false);
    expect(canSaveEditorSignature({ tab: "type", typedName: "  " })).toBe(false);
    expect(canSaveEditorSignature({ tab: "upload", uploadedImage: "" })).toBe(false);
    expect(canSaveEditorSignature({ mode: "initials", typedName: "" })).toBe(false);
  });

  it("enables saving only after the active method contains a signature", () => {
    expect(canSaveEditorSignature({ tab: "draw", hasInk: true })).toBe(true);
    expect(canSaveEditorSignature({ tab: "type", typedName: "Ada Lovelace" })).toBe(true);
    expect(canSaveEditorSignature({ tab: "upload", uploadedImage: "data:image/png;base64,test" })).toBe(true);
    expect(canSaveEditorSignature({ mode: "initials", typedName: "Ada Lovelace" })).toBe(true);
  });

  it("keeps a recent, de-duplicated library of reusable signatures", () => {
    const first = upsertSavedEditorSignature([], { content: "Ada", fontFamily: "Script" }, () => "sig-1");
    const duplicate = upsertSavedEditorSignature(first, { content: "Ada", fontFamily: "Script" }, () => "sig-2");
    const expanded = [
      { content: "Grace", fontFamily: "Script" },
      { content: "Katherine", fontFamily: "Script" },
      { content: "Dorothy", fontFamily: "Script" },
    ].reduce((items, signature, index) => upsertSavedEditorSignature(items, signature, () => `sig-${index + 2}`), duplicate);

    expect(duplicate).toHaveLength(1);
    expect(duplicate[0].id).toBe("sig-1");
    expect(expanded).toHaveLength(3);
    expect(expanded.map((item) => item.content)).toEqual(["Dorothy", "Katherine", "Grace"]);
    expect(removeSavedEditorSignature(expanded, expanded[1].id)).toHaveLength(2);
  });

  it("loads and persists a browser-local signature library safely", () => {
    const values = new Map();
    const storage = {
      getItem: (key) => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    };
    const signatures = upsertSavedEditorSignature([], { content: "Ada" }, () => "sig-1");
    persistEditorSignatureLibrary(signatures, storage);

    expect(loadEditorSignatureLibrary(storage)).toEqual(signatures);
    values.set("pdfenrich.signature-library.v1", "{broken");
    expect(loadEditorSignatureLibrary(storage)).toEqual([]);
    clearEditorSignatureLibrary(storage);
    expect(values.has("pdfenrich.signature-library.v1")).toBe(false);
  });

  it("isolates signatures between accounts and migrates the legacy guest library", () => {
    const values = new Map();
    const storage = {
      getItem: (key) => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    };
    const signatures = upsertSavedEditorSignature([], { content: "Owner A" }, () => "owner-a");
    persistEditorSignatureLibrary(signatures, storage, "user-a");

    expect(loadEditorSignatureLibrary(storage, "user-a")).toEqual(signatures);
    expect(loadEditorSignatureLibrary(storage, "user-b")).toEqual([]);
    expect(editorSignatureLibraryKey("user-a")).not.toBe(editorSignatureLibraryKey("user-b"));

    storage.setItem(EDITOR_SIGNATURE_LIBRARY_KEY, JSON.stringify(signatures));
    expect(loadEditorSignatureLibrary(storage, "realpdf-local-guest")).toEqual(signatures);
  });
});

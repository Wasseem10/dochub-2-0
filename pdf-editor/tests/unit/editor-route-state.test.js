import { describe, expect, it } from "vitest";
import { resolveEditorDocument } from "../../src/router/editorRouteState.js";

describe("editor route restoration", () => {
  const ownedDocument = { id: "doc-1", ownerId: "user-1", pages: [{ id: "page-1" }] };

  it("waits for the document catalog before reporting a missing ID", () => {
    expect(resolveEditorDocument({ documentId: "missing", documents: [], userId: "user-1", catalogReady: false }).status).toBe("loading");
    expect(resolveEditorDocument({ documentId: "missing", documents: [], userId: "user-1", catalogReady: true }).status).toBe("not-found");
  });

  it("returns only documents owned by the authenticated user", () => {
    expect(resolveEditorDocument({ documentId: "doc-1", documents: [ownedDocument], userId: "user-1", catalogReady: true })).toEqual({
      status: "ready",
      document: ownedDocument,
    });
    expect(resolveEditorDocument({ documentId: "doc-1", documents: [ownedDocument], userId: "user-2", catalogReady: true }).status).toBe("unauthorized");
  });

  it("restores guest documents without requiring authentication", () => {
    const guestDocument = { id: "guest-doc", ownerId: "guest", pages: [{ id: "page-1" }] };
    expect(resolveEditorDocument({ documentId: "guest-doc", documents: [guestDocument], catalogReady: true })).toEqual({ status: "ready", document: guestDocument });
    expect(resolveEditorDocument({ documentId: "guest-doc", documents: [guestDocument], userId: "user-1", catalogReady: true }).status).toBe("unauthorized");
  });
});

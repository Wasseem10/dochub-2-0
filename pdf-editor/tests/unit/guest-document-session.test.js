import { describe, expect, it, vi } from "vitest";
import { claimGuestDocument, editorActionNeedsAccount, GUEST_OWNER_ID, recoverDocumentAsGuest, resolveEditorStorageOwnerId } from "../../src/tools/guestDocumentSession.js";

describe("guest document account handoff", () => {
  it("allows guest editing and download but gates cloud-only actions", () => {
    expect(editorActionNeedsAccount("edit", null)).toBe(false);
    expect(editorActionNeedsAccount("save", null)).toBe(true);
    expect(editorActionNeedsAccount("download", null)).toBe(false);
    expect(editorActionNeedsAccount("share", null)).toBe(true);
    expect(editorActionNeedsAccount("saved-signature", null)).toBe(true);
    expect(editorActionNeedsAccount("template", null)).toBe(true);
    expect(editorActionNeedsAccount("save", { uid: "user-1" })).toBe(false);
    expect(editorActionNeedsAccount("download", { uid: "user-1" })).toBe(false);
  });

  it("keeps public editor documents in the guest workspace while authentication restores", () => {
    expect(resolveEditorStorageOwnerId(true, null)).toBe(GUEST_OWNER_ID);
    expect(resolveEditorStorageOwnerId(true, { uid: "user-1" })).toBe(GUEST_OWNER_ID);
    expect(resolveEditorStorageOwnerId(false, { uid: "user-1" })).toBe("user-1");
  });

  it("recovers an earlier account-owned editor document into the public guest session", () => {
    expect(recoverDocumentAsGuest({ id: "doc-1", ownerId: "user-1", pages: [{ id: "page-1" }] }, () => "now")).toMatchObject({
      id: "doc-1",
      ownerId: GUEST_OWNER_ID,
      updatedAt: "now",
    });
    expect(recoverDocumentAsGuest({ id: "metadata-only", ownerId: "user-1" })).toBeNull();
  });

  it("moves only the requested guest document into the signed-in workspace", async () => {
    const stores = new Map([
      [GUEST_OWNER_ID, [
        { id: "guest-sign", ownerId: GUEST_OWNER_ID, name: "signed.pdf", annotations: [{ type: "signature" }] },
        { id: "guest-other", ownerId: GUEST_OWNER_ID, name: "other.pdf" },
      ]],
      ["user-1", [{ id: "saved", ownerId: "user-1", name: "saved.pdf" }]],
    ]);
    const loadDocuments = vi.fn(async (ownerId) => stores.get(ownerId) || []);
    const saveDocuments = vi.fn(async (ownerId, documents) => stores.set(ownerId, documents));

    const claimed = await claimGuestDocument("user-1", "guest-sign", {
      loadDocuments,
      saveDocuments,
      now: () => "2026-07-15T23:59:00.000Z",
    });

    expect(claimed).toMatchObject({ id: "guest-sign", ownerId: "user-1", updatedAt: "2026-07-15T23:59:00.000Z" });
    expect(stores.get("user-1").map((documentRecord) => documentRecord.id)).toEqual(["guest-sign", "saved"]);
    expect(stores.get(GUEST_OWNER_ID).map((documentRecord) => documentRecord.id)).toEqual(["guest-other"]);
    expect(saveDocuments).toHaveBeenCalledTimes(2);
  });

  it("does not change either workspace when the guest document is missing", async () => {
    const loadDocuments = vi.fn(async () => []);
    const saveDocuments = vi.fn();
    await expect(claimGuestDocument("user-1", "missing", { loadDocuments, saveDocuments })).resolves.toBeNull();
    expect(saveDocuments).not.toHaveBeenCalled();
  });
});

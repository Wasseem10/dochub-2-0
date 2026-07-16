import { describe, expect, it, vi } from "vitest";
import { claimGuestDocument, editorActionNeedsAccount, GUEST_OWNER_ID } from "../../src/tools/guestDocumentSession.js";

describe("guest document account handoff", () => {
  it("allows guest editing but gates account save and download actions", () => {
    expect(editorActionNeedsAccount("edit", null)).toBe(false);
    expect(editorActionNeedsAccount("save", null)).toBe(true);
    expect(editorActionNeedsAccount("download", null)).toBe(true);
    expect(editorActionNeedsAccount("save", { uid: "user-1" })).toBe(false);
    expect(editorActionNeedsAccount("download", { uid: "user-1" })).toBe(false);
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

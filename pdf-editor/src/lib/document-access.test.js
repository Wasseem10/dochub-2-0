import { describe, expect, it } from "vitest";
import { canAccessDocument, documentsForViewer, migrateLegacyGuestDocuments, ownershipForViewer } from "./document-access.js";

const ownedA = { id: "a", ownerUid: "user-a" };
const ownedB = { id: "b", ownerUid: "user-b" };
const guestA = { id: "ga", ownerUid: null, guestOwnerId: "guest-a" };
const guestB = { id: "gb", ownerUid: null, guestOwnerId: "guest-b" };

describe("document access", () => {
  it("prevents a signed-in user from opening another owner's document", () => {
    expect(canAccessDocument(ownedA, { uid: "user-a" })).toBe(true);
    expect(canAccessDocument(ownedB, { uid: "user-a" })).toBe(false);
    expect(canAccessDocument(guestA, { uid: "user-a" })).toBe(false);
  });

  it("partitions guest documents by session owner", () => {
    expect(documentsForViewer([guestA, guestB, ownedA], { uid: null, guestOwnerId: "guest-a" })).toEqual([guestA]);
  });

  it("migrates legacy guest records without changing account records", () => {
    const legacy = { id: "legacy", ownerUid: null };
    expect(migrateLegacyGuestDocuments([legacy, ownedA], "guest-a")).toEqual([
      { ...legacy, guestOwnerId: "guest-a" },
      ownedA,
    ]);
  });

  it("creates mutually exclusive account and guest ownership", () => {
    expect(ownershipForViewer({ uid: "user-a", guestOwnerId: "guest-a" })).toEqual({ ownerUid: "user-a", guestOwnerId: null });
    expect(ownershipForViewer({ uid: null, guestOwnerId: "guest-a" })).toEqual({ ownerUid: null, guestOwnerId: "guest-a" });
  });
});

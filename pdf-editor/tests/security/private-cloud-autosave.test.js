import { describe, expect, it } from "vitest";
import {
  privateCloudDocumentNeedsSync,
  shouldAutosavePrivateCloudDocument,
} from "../../src/cloud/privateCloudAutosave.js";

const syncedDocument = {
  userId: "account-1",
  ownerId: "account-1",
  cloudDocumentId: "doc_abcdefghijklmnopqrstuvwxyz",
  localUpdatedAt: "2026-08-05T15:00:02.000Z",
  cloudUpdatedAt: "2026-08-05T15:00:01.000Z",
};

describe("private cloud autosave", () => {
  it("never uploads a document before its explicit cloud link exists", () => {
    expect(privateCloudDocumentNeedsSync({
      ...syncedDocument,
      cloudDocumentId: "",
    })).toBe(false);
  });

  it("only syncs a newer local version owned by the signed-in account", () => {
    expect(privateCloudDocumentNeedsSync(syncedDocument)).toBe(true);
    expect(privateCloudDocumentNeedsSync({
      ...syncedDocument,
      ownerId: "another-account",
    })).toBe(false);
    expect(privateCloudDocumentNeedsSync({
      ...syncedDocument,
      localUpdatedAt: syncedDocument.cloudUpdatedAt,
    })).toBe(false);
  });

  it("waits for a completed local save, connectivity, and cloud configuration", () => {
    expect(shouldAutosavePrivateCloudDocument({
      ...syncedDocument,
      configured: true,
      isOffline: false,
      saveState: "saved",
    })).toBe(true);
    expect(shouldAutosavePrivateCloudDocument({
      ...syncedDocument,
      configured: true,
      isOffline: true,
      saveState: "saved",
    })).toBe(false);
    expect(shouldAutosavePrivateCloudDocument({
      ...syncedDocument,
      configured: true,
      isOffline: false,
      saveState: "unsaved",
    })).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  applyPrivateCloudSaveResult,
  mergeLocalAndPrivateCloudDocuments,
  shouldSyncPrivateCloudDocument,
} from "../../src/cloud/privateCloudCatalog.js";

const CLOUD_ID = `doc_${"A".repeat(24)}`;
const VERSION_ONE = `ver_${"B".repeat(24)}`;
const VERSION_TWO = `ver_${"C".repeat(24)}`;

function cloudRecord(versionId = VERSION_ONE, overrides = {}) {
  return {
    id: CLOUD_ID,
    currentVersionId: versionId,
    displayName: "Quarterly report.pdf",
    sizeBytes: 2048,
    pageCount: 3,
    checksumSha256: "a".repeat(64),
    createdAt: "2026-08-07T12:00:00.000Z",
    updatedAt: versionId === VERSION_ONE ? "2026-08-07T12:00:00.000Z" : "2026-08-07T13:00:00.000Z",
    ...overrides,
  };
}

function localRecord(overrides = {}) {
  return {
    id: "local-document",
    ownerId: "account-a",
    name: "Quarterly report.pdf",
    pages: [{ id: "page-1" }],
    annotations: [],
    updatedAt: "2026-08-07T12:00:00.000Z",
    cloudDocumentId: CLOUD_ID,
    cloudVersionId: VERSION_ONE,
    cloudDirty: false,
    cloudOnly: false,
    ...overrides,
  };
}

describe("private cloud multi-device catalog", () => {
  it("hydrates an empty second-device catalog from the account source of truth", () => {
    const deviceB = mergeLocalAndPrivateCloudDocuments("account-a", [], [cloudRecord()]);
    expect(deviceB).toHaveLength(1);
    expect(deviceB[0]).toMatchObject({
      ownerId: "account-a",
      cloudDocumentId: CLOUD_ID,
      cloudVersionId: VERSION_ONE,
      cloudOnly: true,
      cloudDirty: false,
    });
  });

  it("marks an edited first-device document for a new immutable version", () => {
    const edited = localRecord({ cloudDirty: true, updatedAt: "2026-08-07T13:00:00.000Z" });
    expect(shouldSyncPrivateCloudDocument({
      documentRecord: edited,
      userId: "account-a",
      cloudConfigured: true,
      offline: false,
    })).toBe(true);

    const saved = applyPrivateCloudSaveResult(edited, {
      documentId: CLOUD_ID,
      versionId: VERSION_TWO,
      checksumSha256: "b".repeat(64),
      updatedAt: "2026-08-07T13:00:00.000Z",
    });
    expect(saved).toMatchObject({ cloudVersionId: VERSION_TWO, cloudDirty: false });
  });

  it("forces a second device to download a newer remote version before opening", () => {
    const deviceBWithVersionOne = localRecord();
    const [merged] = mergeLocalAndPrivateCloudDocuments("account-a", [deviceBWithVersionOne], [cloudRecord(VERSION_TWO)]);
    expect(merged).toMatchObject({
      cloudVersionId: VERSION_TWO,
      cloudRefreshRequired: true,
      cloudConflict: false,
    });
    expect(shouldSyncPrivateCloudDocument({
      documentRecord: merged,
      userId: "account-a",
      cloudConfigured: true,
      offline: false,
    })).toBe(false);
  });

  it("flags simultaneous local and remote changes so the UI preserves a recovery copy", () => {
    const [merged] = mergeLocalAndPrivateCloudDocuments(
      "account-a",
      [localRecord({ cloudDirty: true })],
      [cloudRecord(VERSION_TWO)],
    );
    expect(merged).toMatchObject({
      cloudDirty: true,
      cloudRefreshRequired: true,
      cloudConflict: true,
    });
  });

  it("removes a locally cached cloud-linked row after another device deletes it", () => {
    expect(mergeLocalAndPrivateCloudDocuments("account-a", [localRecord()], [])).toEqual([]);
  });

  it("never schedules a document owned by another account", () => {
    expect(shouldSyncPrivateCloudDocument({
      documentRecord: localRecord({ ownerId: "account-a", cloudDirty: true }),
      userId: "account-b",
      cloudConfigured: true,
      offline: false,
    })).toBe(false);
  });

  it("defers account sync while offline without losing the dirty marker", () => {
    const pending = localRecord({ cloudDirty: true });
    expect(shouldSyncPrivateCloudDocument({
      documentRecord: pending,
      userId: "account-a",
      cloudConfigured: true,
      offline: true,
    })).toBe(false);
    expect(pending.cloudDirty).toBe(true);
  });
});

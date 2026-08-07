import { describe, expect, it } from "vitest";
import {
  applyPrivateCloudSaveResult,
  mergeLocalAndPrivateCloudDocuments,
  isPrivateCloudDocumentOpenInFlight,
  privateCloudDocumentOpenKey,
  privateCloudDocumentRequiresDownload,
  replaceWithHydratedPrivateCloudDocument,
  selectNextPrivateCloudSyncDocument,
  shouldNavigateBeforePrivateCloudDownload,
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
    const [merged] = mergeLocalAndPrivateCloudDocuments("account-a", [localRecord()], [cloudRecord(VERSION_TWO)]);
    expect(merged).toMatchObject({ cloudVersionId: VERSION_TWO, cloudRefreshRequired: true, cloudConflict: false });
  });

  it("flags simultaneous local and remote changes so the UI preserves a recovery copy", () => {
    const [merged] = mergeLocalAndPrivateCloudDocuments(
      "account-a",
      [localRecord({ cloudDirty: true })],
      [cloudRecord(VERSION_TWO)],
    );
    expect(merged).toMatchObject({ cloudDirty: true, cloudRefreshRequired: true, cloudConflict: true });
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

  it("selects an older browser-local PDF for background sync from the dashboard", () => {
    const pending = localRecord({
      id: "older-local-document",
      cloudDocumentId: "",
      cloudVersionId: "",
      cloudDirty: true,
      pdfDataUrl: "data:application/pdf;base64,JVBERi0xLjQK",
    });
    expect(selectNextPrivateCloudSyncDocument({
      documents: [pending],
      userId: "account-a",
      cloudConfigured: true,
      offline: false,
    })).toBe(pending);
  });

  it("does not loop a dashboard document already attempted in this session", () => {
    const pending = localRecord({
      id: "older-local-document",
      cloudDocumentId: "",
      cloudDirty: true,
      pages: [{ id: "page-1", source: "blank" }],
    });
    expect(selectNextPrivateCloudSyncDocument({
      documents: [pending],
      userId: "account-a",
      cloudConfigured: true,
      offline: false,
      attemptedKeys: new Set(["account-a:older-local-document"]),
    })).toBeNull();
  });

  it("routes a cloud-only dashboard document to a visible editor loading state before downloading", () => {
    const cloudOnly = {
      id: "cloud-document",
      cloudDocumentId: "doc_abcdefghijklmnopqrstuvwxyz",
      cloudOnly: true,
    };
    expect(privateCloudDocumentRequiresDownload(cloudOnly)).toBe(true);
    expect(shouldNavigateBeforePrivateCloudDownload("dashboard", cloudOnly)).toBe(true);
    expect(shouldNavigateBeforePrivateCloudDownload("editor", cloudOnly)).toBe(false);
  });

  it("keeps a hydrated cloud PDF available in memory when mobile offline caching fails", () => {
    const placeholder = { id: "cloud-document", cloudOnly: true, pages: [] };
    const hydrated = { id: "cloud-document", cloudOnly: false, pages: [{ id: "page-1" }] };
    const local = { id: "local-document", cloudOnly: false };
    expect(replaceWithHydratedPrivateCloudDocument([placeholder, local], hydrated)).toEqual([
      hydrated,
      local,
    ]);
  });

  it("blocks a second route hydration while the downloaded cloud PDF is still opening", () => {
    const cloudDocument = {
      id: "cloud-document",
      cloudDocumentId: "doc_abcdefghijklmnopqrstuvwxyz",
      cloudOnly: false,
      pages: [{ id: "page-1" }],
    };
    const openKey = privateCloudDocumentOpenKey("account-a", cloudDocument);
    expect(openKey).toBe("account-a:doc_abcdefghijklmnopqrstuvwxyz");
    expect(isPrivateCloudDocumentOpenInFlight(new Set([openKey]), "account-a", cloudDocument)).toBe(true);
    expect(isPrivateCloudDocumentOpenInFlight(new Set(), "account-a", cloudDocument)).toBe(false);
  });
});

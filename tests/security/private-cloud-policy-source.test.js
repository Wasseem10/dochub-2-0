import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));
const firestoreRules = readFileSync(`${root}/firestore.rules`, "utf8");
const storageRules = readFileSync(`${root}/storage.rules`, "utf8");

/*
 * These are source-policy regression checks, not Firebase emulator tests. They
 * ensure a broad client allow cannot silently return in reviewable rule files.
 */
describe("private-cloud direct-access policy source", () => {
  it("denies browser reads and writes to server-authoritative Firestore metadata", () => {
    expect(firestoreRules).toMatch(
      /match \/users\/\{userId\}\/privateDocuments\/\{documentId\}\s*\{\s*allow read, write: if false;/,
    );
    expect(firestoreRules).toMatch(
      /match \/versions\/\{versionId\}\s*\{\s*allow read, write: if false;/,
    );
    expect(firestoreRules).toMatch(
      /match \/users\/\{userId\}\/privateCloudUploads\/\{uploadId\}\s*\{\s*allow read, write: if false;/,
    );
    expect(firestoreRules).toMatch(
      /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/,
    );
  });

  it("denies direct browser access to every private document object and nested asset", () => {
    expect(storageRules).toMatch(
      /match \/users\/\{userId\}\/documents\/\{documentId\}\/\{allDocumentObjects=\*\*\}\s*\{[\s\S]*?allow read, write: if false;/,
    );
    expect(storageRules).toMatch(
      /match \/\{allPaths=\*\*\}\s*\{\s*allow read, write: if false;/,
    );
  });

  it("keeps the legacy migration bridge owner-scoped and read/delete-only", () => {
    expect(firestoreRules).toMatch(
      /match \/users\/\{userId\}\/documents\/\{documentId\}[\s\S]*?allow get, list, delete: if isSignedIn\(\)[\s\S]*?request\.auth\.uid == userId[\s\S]*?allow create, update: if false;/,
    );
    expect(storageRules).toMatch(
      /match \/users\/\{userId\}\/documents\/\{documentId\}\/document\.json[\s\S]*?allow read, delete: if ownsPath\(userId\);[\s\S]*?allow create, update: if false;/,
    );
  });
});

describe("revocable share policy source", () => {
  it("requires active, unexpired shares and forbids share directory listing", () => {
    expect(firestoreRules).toMatch(
      /resource\.data\.status == "active"[\s\S]*?resource\.data\.expiresAt > request\.time/,
    );
    expect(firestoreRules).toMatch(/match \/shareLinks\/\{shareId\}[\s\S]*?allow list: if false;/);
    expect(storageRules).toMatch(
      /function isActiveShare\(shareId\)[\s\S]*?share\.data\.status == "active"[\s\S]*?share\.data\.expiresAt > request\.time/,
    );
  });

  it("uses fixed-shape SHA-256 identifiers for new shares and activation", () => {
    expect(firestoreRules).toContain('shareId.matches("^[a-f0-9]{64}$")');
    expect(storageRules).toContain('shareId.matches("^[a-f0-9]{64}$")');
    expect(firestoreRules).toMatch(
      /allow create: if isSignedIn\(\)\s*&& isCurrentShareId\(\)/,
    );
    expect(firestoreRules).toMatch(
      /\(isCurrentShareId\(\)\s*&& accountAcceptsContentWrites\(request\.auth\.uid\)[\s\S]*?resource\.data\.status == "uploading"[\s\S]*?request\.resource\.data\.status == "active"/,
    );
    expect(firestoreRules).not.toMatch(
      /allow update: if \(isCurrentShareId\(\) \|\| isLegacyShareId\(\)\)/,
    );
    expect(storageRules).toMatch(
      /allow create: if isCurrentShareId\(shareId\)/,
    );
  });

  it("revokes first and keeps the owner/object association for trusted cleanup", () => {
    expect(firestoreRules).toMatch(
      /request\.resource\.data\.status == "revoked"[\s\S]*?request\.resource\.data\.revokedAt == request\.time/,
    );
    expect(firestoreRules).toMatch(
      /allow delete: if false;/,
    );
    expect(storageRules).toMatch(
      /allow delete: if \(isCurrentShareId\(shareId\) \|\| isLegacyShareId\(shareId\)\)[\s\S]*?ownsShare\(shareId\)/,
    );
  });

  it("keeps revocation and cleanup available while content writes are locked", () => {
    const shareUpdate = firestoreRules
      .slice(firestoreRules.indexOf("allow update: if isSignedIn()", firestoreRules.indexOf("match /shareLinks/{shareId}")))
      .split("allow delete: if false;")[0];
    const [activationBranch, revocationBranch] = shareUpdate.split("|| ((isCurrentShareId() || isLegacyShareId())");
    expect(activationBranch).toContain("accountAcceptsContentWrites(request.auth.uid)");
    expect(revocationBranch).toContain('request.resource.data.status == "revoked"');
    expect(revocationBranch).not.toContain("accountAcceptsContentWrites");

    const shareStorageDelete = storageRules
      .slice(storageRules.indexOf("allow delete:", storageRules.indexOf("match /shares/{shareId}/document.pdf")))
      .split("}")[0];
    expect(shareStorageDelete).toContain("ownsShare(shareId)");
    expect(shareStorageDelete).not.toContain("accountAcceptsContentWrites");
    expect(firestoreRules).toMatch(
      /match \/signingRequests\/\{tokenHash\}[\s\S]*?allow delete: if isSignedIn\(\) && resource\.data\.ownerId == request\.auth\.uid;/,
    );
  });

  it("blocks new share and signing content while an account is purging or deleted", () => {
    expect(firestoreRules).toMatch(
      /function accountAcceptsContentWrites\(userId\)[\s\S]*?_privateCloudAccountState[\s\S]*?\.data\.state == "active"/,
    );
    expect(storageRules).toMatch(
      /function accountAcceptsContentWrites\(userId\)[\s\S]*?_privateCloudAccountState[\s\S]*?\.data\.state == "active"/,
    );
    expect(firestoreRules.match(/accountAcceptsContentWrites\(/g)?.length).toBeGreaterThanOrEqual(4);
    expect(storageRules).toMatch(
      /allow create: if isCurrentShareId\(shareId\)[\s\S]*?accountAcceptsContentWrites\(request\.auth\.uid\)/,
    );
    expect(firestoreRules).toMatch(
      /match \/_privateCloudAccountState\/\{userId\}\s*\{\s*allow read, write: if false;/,
    );
  });

  it("requires a linked private document to remain owner-matched and active", () => {
    expect(firestoreRules).toMatch(
      /sourceDocumentIsActive\(\)[\s\S]*?privateDocuments[\s\S]*?\.data\.ownerId == resource\.data\.ownerId[\s\S]*?\.data\.state == "active"/,
    );
    expect(storageRules).toMatch(
      /function shareSourceIsActive\(shareId\)[\s\S]*?privateDocuments[\s\S]*?\.data\.ownerId == share\.data\.ownerId[\s\S]*?\.data\.state == "active"/,
    );
    expect(firestoreRules).toMatch(
      /match \/chunks\/\{chunkId\}[\s\S]*?linkedSourceDocumentIsActive\(\)[\s\S]*?allow create: if false;/,
    );
    expect(firestoreRules).toMatch(
      /match \/signingRequests\/\{tokenHash\}[\s\S]*?allow create:[\s\S]*?linkedSourceDocumentIsActive\(\)[\s\S]*?allow update:[\s\S]*?linkedSourceDocumentIsActive\(\)/,
    );
  });
});

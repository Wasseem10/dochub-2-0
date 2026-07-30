import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  privateVersionStorageKey,
  PrivateCloudSecurityError,
  uploadIntentKey,
} from "../../functions/src/security/privateCloudDocumentService.js";

const inspection = vi.hoisted(() => ({
  downloadAndFastInspectPrivatePdf: vi.fn(async (file) => ({
    bytes: new Uint8Array([1, 2, 3]),
    contentType: "application/pdf",
    generation: String(file.record?.generation || "1"),
    objectMetadata: Object.freeze({}),
    sha256: file.record?.sha256 || "a".repeat(64),
    size: Number(file.record?.size || 100),
  })),
  inspectParsedPrivatePdf: vi.fn(async () => ({ pageCount: 1 })),
}));

vi.mock("../../functions/src/security/productionPdfInspection.js", () => inspection);

const { createPrivateCloudDocumentService } = await import(
  "../../functions/src/services/privateCloudDocuments.js"
);

const fixedNow = new Date("2026-07-29T12:00:00.000Z");
const userA = "firebase-user-a";
const userB = "firebase-user-b";
const documentA = `doc_${"A".repeat(24)}`;
const documentB = `doc_${"B".repeat(24)}`;
const version1 = `ver_${"1".repeat(24)}`;
const version2 = `ver_${"2".repeat(24)}`;
const versionPending = `ver_${"3".repeat(24)}`;
const shareId = "d".repeat(64);

function fakeTimestamp(date) {
  const captured = new Date(date);
  return {
    toDate: () => new Date(captured),
    toMillis: () => captured.getTime(),
  };
}

function clone(value) {
  if (value == null) return value;
  if (value?.toDate instanceof Function) return value;
  if (Array.isArray(value)) return value.map(clone);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, clone(nested)]));
  }
  return value;
}

function comparable(value) {
  if (value?.toDate instanceof Function) return value.toDate().getTime();
  return value;
}

class FakeSnapshot {
  constructor(reference, value) {
    this.ref = reference;
    this.id = reference.id;
    this.exists = value !== undefined;
    this._value = value;
  }

  data() {
    return this.exists ? clone(this._value) : undefined;
  }
}

class FakeReference {
  constructor(database, path) {
    this.database = database;
    this.path = path.replace(/^\/+|\/+$/g, "");
    this.id = this.path.split("/").at(-1);
  }

  collection(name) {
    return new FakeQuery(this.database, `${this.path}/${name}`);
  }

  async get() {
    return new FakeSnapshot(this, this.database.records.get(this.path));
  }

  async set(value, options = {}) {
    const prior = this.database.records.get(this.path);
    this.database.records.set(
      this.path,
      options.merge && prior ? { ...clone(prior), ...clone(value) } : clone(value),
    );
  }

  async update(value) {
    if (!this.database.records.has(this.path)) throw new Error(`Missing ${this.path}`);
    await this.set(value, { merge: true });
  }

  async delete() {
    this.database.records.delete(this.path);
  }
}

class FakeQuery {
  constructor(database, path, {
    collectionGroup = false,
    filters = [],
    maximum = Infinity,
    ordering = null,
    startAfterId = "",
  } = {}) {
    this.database = database;
    this.path = path.replace(/^\/+|\/+$/g, "");
    this.collectionGroup = collectionGroup;
    this.filters = filters;
    this.maximum = maximum;
    this.ordering = ordering;
    this.startAfterId = startAfterId;
  }

  _next(changes) {
    return new FakeQuery(this.database, this.path, {
      collectionGroup: this.collectionGroup,
      filters: this.filters,
      maximum: this.maximum,
      ordering: this.ordering,
      startAfterId: this.startAfterId,
      ...changes,
    });
  }

  doc(id) {
    return new FakeReference(this.database, `${this.path}/${id}`);
  }

  where(field, operator, value) {
    return this._next({ filters: [...this.filters, [field, operator, value]] });
  }

  orderBy(field, direction = "asc") {
    return this._next({ ordering: [field, direction] });
  }

  limit(value) {
    return this._next({ maximum: Number(value) });
  }

  startAfter(snapshot) {
    return this._next({ startAfterId: snapshot.id });
  }

  async get() {
    const targetSegments = this.path.split("/");
    let entries = [...this.database.records.entries()].filter(([recordPath]) => {
      const segments = recordPath.split("/");
      if (this.collectionGroup) {
        return segments.length >= 2 && segments.at(-2) === this.path;
      }
      return (
        segments.length === targetSegments.length + 1
        && segments.slice(0, targetSegments.length).join("/") === this.path
      );
    });
    for (const [field, operator, expected] of this.filters) {
      entries = entries.filter(([, record]) => {
        const actual = record?.[field];
        if (operator === "==") return actual === expected;
        if (operator === "in") return expected.includes(actual);
        if (operator === "<=") return comparable(actual) <= comparable(expected);
        if (operator === "<") return comparable(actual) < comparable(expected);
        throw new Error(`Unsupported fake query operator ${operator}`);
      });
    }
    if (this.ordering) {
      const [field, direction] = this.ordering;
      entries.sort(([, left], [, right]) => {
        const compared = comparable(left?.[field]) - comparable(right?.[field]);
        return direction === "desc" ? -compared : compared;
      });
    }
    if (this.startAfterId) {
      const index = entries.findIndex(([path]) => path.endsWith(`/${this.startAfterId}`));
      if (index >= 0) entries = entries.slice(index + 1);
    }
    entries = entries.slice(0, this.maximum);
    const docs = entries.map(([path, value]) => (
      new FakeSnapshot(new FakeReference(this.database, path), value)
    ));
    return {
      docs,
      empty: docs.length === 0,
      size: docs.length,
    };
  }
}

class FakeWriteSet {
  constructor(database) {
    this.database = database;
    this.operations = [];
  }

  async get(reference) {
    return reference.get();
  }

  set(reference, value, options) {
    this.operations.push(() => reference.set(value, options));
  }

  update(reference, value) {
    this.operations.push(() => reference.update(value));
  }

  create(reference, value) {
    this.operations.push(async () => {
      if ((await reference.get()).exists) throw new Error(`Already exists: ${reference.path}`);
      await reference.set(value);
    });
  }

  delete(reference) {
    this.operations.push(() => reference.delete());
  }

  async commit() {
    for (const operation of this.operations) await operation();
  }
}

class FakeFirestore {
  constructor(seed = {}) {
    this.records = new Map(
      Object.entries(seed).map(([path, value]) => [path, clone(value)]),
    );
    this.failTransactionCountdown = 0;
    this.failAfterCommitCountdown = 0;
  }

  collection(name) {
    return new FakeQuery(this, name);
  }

  collectionGroup(name) {
    return new FakeQuery(this, name, { collectionGroup: true });
  }

  batch() {
    return new FakeWriteSet(this);
  }

  async runTransaction(callback) {
    const writes = new FakeWriteSet(this);
    const result = await callback(writes);
    if (this.failTransactionCountdown > 0) {
      this.failTransactionCountdown -= 1;
      if (this.failTransactionCountdown === 0) {
        throw new Error("injected metadata transaction failure");
      }
    }
    await writes.commit();
    if (this.failAfterCommitCountdown > 0) {
      this.failAfterCommitCountdown -= 1;
      if (this.failAfterCommitCountdown === 0) {
        throw new Error("injected lost transaction acknowledgement");
      }
    }
    return result;
  }

  async recursiveDelete(reference) {
    for (const path of [...this.records.keys()]) {
      if (path === reference.path || path.startsWith(`${reference.path}/`)) {
        this.records.delete(path);
      }
    }
  }

  value(path) {
    return this.records.get(path);
  }
}

class FakeBucketFile {
  constructor(bucket, path, record = null) {
    this.bucket = bucket;
    this.name = path;
    this.record = record;
  }

  async exists() {
    return [this.bucket.objects.has(this.name)];
  }

  async createResumableUpload() {
    this.bucket.sessionAttempts += 1;
    if (this.bucket.failSessionAttempts > 0) {
      this.bucket.failSessionAttempts -= 1;
      throw new Error("provider session unavailable");
    }
    return [`https://storage.googleapis.com/upload/session-${this.bucket.sessionAttempts}`];
  }

  async delete() {
    this.bucket.objects.delete(this.name);
  }
}

class FakeBucket {
  constructor(seed = {}) {
    this.name = "private-test-bucket";
    this.objects = new Map(Object.entries(seed).map(([path, value]) => [path, { ...value }]));
    this.failSessionAttempts = 0;
    this.sessionAttempts = 0;
  }

  file(path) {
    return new FakeBucketFile(this, path, this.objects.get(path) || null);
  }

  async getFiles({ prefix, maxResults = Infinity }) {
    const files = [...this.objects.entries()]
      .filter(([path]) => path.startsWith(prefix))
      .slice(0, maxResults)
      .map(([path, record]) => new FakeBucketFile(this, path, record));
    return [files];
  }
}

function serviceHarness({
  records = {},
  objects = {},
  clock = () => fixedNow,
  fetchImpl = vi.fn(async () => ({ status: 499 })),
} = {}) {
  const db = new FakeFirestore(records);
  const bucket = new FakeBucket(objects);
  let randomCall = 0;
  const service = createPrivateCloudDocumentService({
    db,
    bucket,
    scanner: {
      scan: vi.fn(async () => ({ status: "clean", engineVersion: "test" })),
    },
    config: {
      maximumAccountBytes: 100 * 1024 * 1024,
      maximumFileBytes: 50 * 1024 * 1024,
      trashRetentionDays: 30,
    },
    clock,
    randomBytes: (size) => new Uint8Array(size).fill(++randomCall),
    fetchImpl,
  });
  return { bucket, db, fetchImpl, service };
}

function activeDocument(ownerId, documentId, currentVersionId, overrides = {}) {
  return {
    ownerId,
    documentId,
    displayName: "Document.pdf",
    state: "active",
    currentVersionId,
    currentSize: 200,
    currentSha256: "b".repeat(64),
    pageCount: 2,
    versionCount: 2,
    createdAt: fakeTimestamp(fixedNow),
    updatedAt: fakeTimestamp(fixedNow),
    deletedAt: null,
    retentionUntil: null,
    ...overrides,
  };
}

function activeVersion(ownerId, documentId, versionId, size, sha256) {
  return {
    ownerId,
    documentId,
    versionId,
    storageKey: privateVersionStorageKey(ownerId, documentId, versionId),
    displayName: "Document.pdf",
    state: "active",
    size,
    sha256,
    generation: "1",
    pageCount: 1,
    createdAt: fakeTimestamp(fixedNow),
    updatedAt: fakeTimestamp(fixedNow),
  };
}

beforeEach(() => {
  inspection.downloadAndFastInspectPrivatePdf.mockClear();
  inspection.inspectParsedPrivatePdf.mockClear();
});

describe("owner isolation in the private document service", () => {
  it("cannot read or mutate another account by changing the document ID", async () => {
    const storageKeyB = privateVersionStorageKey(userB, documentB, version1);
    const { bucket, db, service } = serviceHarness({
      records: {
        [`users/${userB}/privateDocuments/${documentB}`]:
          activeDocument(userB, documentB, version1, { versionCount: 1 }),
        [`users/${userB}/privateDocuments/${documentB}/versions/${version1}`]:
          activeVersion(userB, documentB, version1, 100, "a".repeat(64)),
      },
      objects: {
        [storageKeyB]: { size: 100, sha256: "a".repeat(64), generation: "1" },
      },
    });

    await expect(service.prepareDownload(userA, documentB, "")).rejects.toMatchObject({
      code: "document_not_found",
      status: 404,
    });
    await service.purgeDocument(userA, documentB);

    expect(db.value(`users/${userB}/privateDocuments/${documentB}`)).toBeDefined();
    expect(db.value(
      `users/${userB}/privateDocuments/${documentB}/versions/${version1}`,
    )).toBeDefined();
    expect(bucket.objects.has(storageKeyB)).toBe(true);
  });
});

describe("interrupted upload state and idempotent retry", () => {
  it("stores the resumable session server-side and reuses it without issuing a duplicate session", async () => {
    const { bucket, db, fetchImpl, service } = serviceHarness();
    const request = {
      fileName: "Resume me.pdf",
      sizeBytes: 1_024,
      contentType: "application/pdf",
      checksumSha256: "a".repeat(64),
      idempotencyKey: "upload-attempt-resumable-0001",
    };

    const first = await service.beginUpload(userA, request, "https://pdfenrich.com");
    const second = await service.beginUpload(userA, request, "https://pdfenrich.com");

    expect(first.uploadSessionUrl).toMatch(
      /^https:\/\/storage\.googleapis\.com\/upload\/session-\d+$/,
    );
    expect(second).toMatchObject({
      uploadId: first.uploadId,
      documentId: first.documentId,
      versionId: first.versionId,
      state: "uploading",
      uploadSessionUrl: first.uploadSessionUrl,
      reused: true,
    });
    expect(db.value(`_privateCloudUploadIntents/${first.uploadId}`)).toMatchObject({
      ownerId: userA,
      documentId: first.documentId,
      versionId: first.versionId,
      uploadSessionUrl: first.uploadSessionUrl,
      reservationCharged: true,
    });
    expect(bucket.sessionAttempts).toBe(1);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("never marks a failed session creation active and retries without double-reserving quota", async () => {
    const { bucket, db, service } = serviceHarness();
    bucket.failSessionAttempts = 1;
    const request = {
      fileName: "Retry.pdf",
      sizeBytes: 1_024,
      contentType: "application/pdf",
      checksumSha256: "a".repeat(64),
      idempotencyKey: "upload-attempt-retry-0001",
    };

    await expect(service.beginUpload(userA, request, "https://pdfenrich.com")).rejects.toMatchObject({
      code: "upload_session_failed",
      status: 503,
    });
    const uploadId = uploadIntentKey(userA, request.idempotencyKey);
    const pending = db.value(`_privateCloudUploadIntents/${uploadId}`);
    const usageAfterFailure = db.value(`_privateCloudUsage/${userA}`);
    expect(pending.state).toBe("uploading");
    expect(usageAfterFailure).toMatchObject({
      activeBytes: 0,
      reservedBytes: request.sizeBytes,
      documentCount: 1,
    });
    expect([...db.records.values()].some((record) => record?.state === "active")).toBe(false);

    const retry = await service.beginUpload(userA, request, "https://pdfenrich.com");
    expect(retry).toMatchObject({
      state: "uploading",
      uploadId,
      documentId: pending.documentId,
      versionId: pending.versionId,
      reused: true,
    });
    expect(db.value(`_privateCloudUsage/${userA}`)).toEqual(usageAfterFailure);
  });

  it("confirms cancellation before releasing an expired upload reservation", async () => {
    let now = fixedNow;
    let observedAtCancellation = null;
    let harness;
    let uploadId = "";
    const fetchImpl = vi.fn(async () => {
      observedAtCancellation = {
        intent: clone(harness.db.value(`_privateCloudUploadIntents/${uploadId}`)),
        usage: clone(harness.db.value(`_privateCloudUsage/${userA}`)),
      };
      return { status: 499 };
    });
    harness = serviceHarness({ clock: () => now, fetchImpl });
    const request = {
      fileName: "Interrupted.pdf",
      sizeBytes: 2_048,
      contentType: "application/pdf",
      checksumSha256: "a".repeat(64),
      idempotencyKey: "upload-attempt-cancel-before-release-0001",
    };
    const reservation = await harness.service.beginUpload(
      userA,
      request,
      "https://pdfenrich.com",
    );
    uploadId = reservation.uploadId;
    now = new Date(fixedNow.getTime() + 25 * 60 * 60 * 1_000);

    await expect(harness.service.reconcile()).resolves.toMatchObject({ failedUploads: 1 });

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0][0]).toBe(reservation.uploadSessionUrl);
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({
      method: "DELETE",
      redirect: "error",
    });
    expect(observedAtCancellation).toMatchObject({
      intent: {
        state: "cleanup_pending",
        reservationCharged: true,
        uploadSessionUrl: reservation.uploadSessionUrl,
      },
      usage: {
        activeBytes: 0,
        reservedBytes: request.sizeBytes,
        documentCount: 1,
      },
    });
    expect(harness.db.value(`_privateCloudUsage/${userA}`)).toMatchObject({
      activeBytes: 0,
      reservedBytes: 0,
      documentCount: 0,
    });
    expect(harness.db.value(`_privateCloudUploadIntents/${uploadId}`)).toMatchObject({
      state: "failed",
      reservationCharged: false,
      uploadSessionUrl: null,
    });
  });

  it("keeps quota charged and cleanup pending when upload-session cancellation is unconfirmed", async () => {
    let now = fixedNow;
    const fetchImpl = vi.fn(async () => ({ status: 500 }));
    const { db, service } = serviceHarness({ clock: () => now, fetchImpl });
    const request = {
      fileName: "Still resumable.pdf",
      sizeBytes: 2_048,
      contentType: "application/pdf",
      checksumSha256: "a".repeat(64),
      idempotencyKey: "upload-attempt-cancel-failure-0001",
    };
    const reservation = await service.beginUpload(userA, request, "https://pdfenrich.com");
    now = new Date(fixedNow.getTime() + 25 * 60 * 60 * 1_000);

    await expect(service.reconcile()).resolves.toMatchObject({ failedUploads: 0 });

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(db.value(`_privateCloudUploadIntents/${reservation.uploadId}`)).toMatchObject({
      state: "cleanup_pending",
      reservationCharged: true,
      uploadSessionUrl: reservation.uploadSessionUrl,
    });
    expect(db.value(
      `users/${userA}/privateDocuments/${reservation.documentId}/versions/${reservation.versionId}`,
    )).toMatchObject({
      state: "cleanup_pending",
      reservationCharged: true,
    });
    expect(db.value(`_privateCloudUsage/${userA}`)).toMatchObject({
      activeBytes: 0,
      reservedBytes: request.sizeBytes,
      documentCount: 1,
    });
  });

  it("reconciliation releases an expired non-active reservation and its quota", async () => {
    let now = fixedNow;
    const { bucket, db, service } = serviceHarness({ clock: () => now });
    bucket.failSessionAttempts = 1;
    const request = {
      fileName: "Expired retry.pdf",
      sizeBytes: 2_048,
      contentType: "application/pdf",
      checksumSha256: "a".repeat(64),
      idempotencyKey: "upload-attempt-expired-0001",
    };

    await expect(service.beginUpload(userA, request, "https://pdfenrich.com")).rejects.toMatchObject({
      code: "upload_session_failed",
    });
    now = new Date(fixedNow.getTime() + 25 * 60 * 60 * 1_000);

    await expect(service.reconcile()).resolves.toMatchObject({ failedUploads: 1 });
    expect(db.value(`_privateCloudUsage/${userA}`)).toMatchObject({
      activeBytes: 0,
      reservedBytes: 0,
      documentCount: 0,
    });
    expect([...db.records.keys()].some((path) => path.includes("/privateDocuments/"))).toBe(false);
    expect(
      db.value(`_privateCloudUploadIntents/${uploadIntentKey(userA, request.idempotencyKey)}`),
    ).toMatchObject({ state: "failed" });
  });

  it("releases an expired reservation exactly once across repeated reconciliation", async () => {
    let now = fixedNow;
    const { db, fetchImpl, service } = serviceHarness({ clock: () => now });
    const request = {
      fileName: "One cleanup.pdf",
      sizeBytes: 4_096,
      contentType: "application/pdf",
      checksumSha256: "a".repeat(64),
      idempotencyKey: "upload-attempt-exactly-once-0001",
    };
    const reservation = await service.beginUpload(userA, request, "https://pdfenrich.com");
    now = new Date(fixedNow.getTime() + 25 * 60 * 60 * 1_000);

    await service.reconcile();
    const usageAfterFirstCleanup = clone(db.value(`_privateCloudUsage/${userA}`));
    const intentAfterFirstCleanup = clone(
      db.value(`_privateCloudUploadIntents/${reservation.uploadId}`),
    );
    await service.reconcile();

    expect(usageAfterFirstCleanup).toMatchObject({
      activeBytes: 0,
      reservedBytes: 0,
      documentCount: 0,
    });
    expect(db.value(`_privateCloudUsage/${userA}`)).toEqual(usageAfterFirstCleanup);
    expect(intentAfterFirstCleanup).toMatchObject({
      state: "failed",
      reservationCharged: false,
    });
    expect(db.value(`_privateCloudUploadIntents/${reservation.uploadId}`)).toEqual(
      intentAfterFirstCleanup,
    );
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("does not let stale cleanup mutate a newer reservation that reused the idempotency key", async () => {
    let now = fixedNow;
    let allowCancellation;
    let cancellationStarted;
    const cancellationEntered = new Promise((resolve) => {
      cancellationStarted = resolve;
    });
    const cancellationGate = new Promise((resolve) => {
      allowCancellation = resolve;
    });
    const fetchImpl = vi.fn(async () => {
      cancellationStarted();
      await cancellationGate;
      return { status: 499 };
    });
    const { db, service } = serviceHarness({ clock: () => now, fetchImpl });
    const request = {
      fileName: "ABA protection.pdf",
      sizeBytes: 1_024,
      contentType: "application/pdf",
      checksumSha256: "a".repeat(64),
      idempotencyKey: "upload-attempt-aba-protection-0001",
    };
    const staleReservation = await service.beginUpload(userA, request, "https://pdfenrich.com");
    now = new Date(fixedNow.getTime() + 25 * 60 * 60 * 1_000);

    const staleCleanup = service.reconcile();
    await cancellationEntered;

    const newerDocumentId = `doc_${"N".repeat(24)}`;
    const newerVersionId = `ver_${"9".repeat(24)}`;
    const newerStorageKey = privateVersionStorageKey(
      userA,
      newerDocumentId,
      newerVersionId,
    );
    const newerSessionUrl = "https://storage.googleapis.com/upload/session-newer";
    const newerTimestamp = fakeTimestamp(now);
    db.records.delete(
      `users/${userA}/privateDocuments/${staleReservation.documentId}/versions/${staleReservation.versionId}`,
    );
    db.records.delete(`users/${userA}/privateDocuments/${staleReservation.documentId}`);
    db.records.set(
      `users/${userA}/privateDocuments/${newerDocumentId}`,
      activeDocument(userA, newerDocumentId, null, {
        state: "pending",
        currentVersionId: null,
        currentSize: 0,
        currentSha256: null,
        pageCount: 0,
        versionCount: 1,
        createdAt: newerTimestamp,
        updatedAt: newerTimestamp,
      }),
    );
    db.records.set(
      `users/${userA}/privateDocuments/${newerDocumentId}/versions/${newerVersionId}`,
      {
        ownerId: userA,
        documentId: newerDocumentId,
        versionId: newerVersionId,
        storageKey: newerStorageKey,
        displayName: request.fileName,
        state: "uploading",
        declaredSize: request.sizeBytes,
        contentType: request.contentType,
        expectedSha256: request.checksumSha256,
        idempotencyKeyHash: staleReservation.uploadId,
        reservationCharged: true,
        createdAt: newerTimestamp,
        updatedAt: newerTimestamp,
        expiresAt: fakeTimestamp(now.getTime() + 24 * 60 * 60 * 1_000),
      },
    );
    db.records.set(`_privateCloudUploadIntents/${staleReservation.uploadId}`, {
      ownerId: userA,
      uploadId: staleReservation.uploadId,
      documentId: newerDocumentId,
      requestedDocumentId: null,
      versionId: newerVersionId,
      storageKey: newerStorageKey,
      displayName: request.fileName,
      declaredSize: request.sizeBytes,
      contentType: request.contentType,
      expectedSha256: request.checksumSha256,
      state: "uploading",
      reservationCharged: true,
      uploadSessionUrl: newerSessionUrl,
      createdAt: newerTimestamp,
      updatedAt: newerTimestamp,
      expiresAt: fakeTimestamp(now.getTime() + 24 * 60 * 60 * 1_000),
    });
    db.records.set(`_privateCloudUsage/${userA}`, {
      ownerId: userA,
      activeBytes: 0,
      reservedBytes: request.sizeBytes,
      documentCount: 1,
      updatedAt: newerTimestamp,
    });

    allowCancellation();
    await staleCleanup;

    expect(db.value(`_privateCloudUploadIntents/${staleReservation.uploadId}`)).toMatchObject({
      documentId: newerDocumentId,
      versionId: newerVersionId,
      storageKey: newerStorageKey,
      state: "uploading",
      reservationCharged: true,
      uploadSessionUrl: newerSessionUrl,
    });
    expect(db.value(
      `users/${userA}/privateDocuments/${newerDocumentId}/versions/${newerVersionId}`,
    )).toMatchObject({
      state: "uploading",
      reservationCharged: true,
    });
    expect(db.value(`_privateCloudUsage/${userA}`)).toMatchObject({
      activeBytes: 0,
      reservedBytes: request.sizeBytes,
      documentCount: 1,
    });
  });

  it("removes an uploaded object and pending metadata after a terminal PDF validation failure", async () => {
    const { bucket, db, service } = serviceHarness();
    const request = {
      fileName: "Unsafe.pdf",
      sizeBytes: 1_024,
      contentType: "application/pdf",
      checksumSha256: "a".repeat(64),
      idempotencyKey: "upload-attempt-unsafe-0001",
    };
    const reservation = await service.beginUpload(userA, request, "https://pdfenrich.com");
    const storageKey = privateVersionStorageKey(
      userA,
      reservation.documentId,
      reservation.versionId,
    );
    bucket.objects.set(storageKey, {
      generation: "1",
      sha256: request.checksumSha256,
      size: request.sizeBytes,
    });
    inspection.downloadAndFastInspectPrivatePdf.mockRejectedValueOnce(
      new PrivateCloudSecurityError(
        "encrypted_pdf_not_supported",
        "The PDF contains unsupported encryption.",
        422,
      ),
    );

    await expect(service.finalizeUpload(userA, reservation.uploadId, {
      checksumSha256: request.checksumSha256,
      idempotencyKey: request.idempotencyKey,
    })).rejects.toMatchObject({
      code: "encrypted_pdf_not_supported",
      status: 422,
    });

    expect(bucket.objects.has(storageKey)).toBe(false);
    expect(db.value(
      `users/${userA}/privateDocuments/${reservation.documentId}`,
    )).toBeUndefined();
    expect(db.value(
      `users/${userA}/privateDocuments/${reservation.documentId}/versions/${reservation.versionId}`,
    )).toBeUndefined();
    expect(db.value(`_privateCloudUsage/${userA}`)).toMatchObject({
      activeBytes: 0,
      reservedBytes: 0,
      documentCount: 0,
    });
    expect(db.value(`_privateCloudUploadIntents/${reservation.uploadId}`)).toMatchObject({
      state: "failed",
    });
  });

  it("keeps a verified object attached to non-active metadata when activation fails, then retries safely", async () => {
    const { bucket, db, service } = serviceHarness();
    const request = {
      fileName: "Metadata retry.pdf",
      sizeBytes: 1_024,
      contentType: "application/pdf",
      checksumSha256: "a".repeat(64),
      idempotencyKey: "upload-attempt-metadata-0001",
    };
    const reservation = await service.beginUpload(userA, request, "https://pdfenrich.com");
    const storageKey = privateVersionStorageKey(
      userA,
      reservation.documentId,
      reservation.versionId,
    );
    bucket.objects.set(storageKey, {
      generation: "1",
      sha256: request.checksumSha256,
      size: request.sizeBytes,
    });
    // Finalization spends one transaction on its rate limit and one on the
    // validating-state transition before the atomic activation transaction.
    db.failTransactionCountdown = 3;

    await expect(service.finalizeUpload(userA, reservation.uploadId, {
      checksumSha256: request.checksumSha256,
      idempotencyKey: request.idempotencyKey,
    })).rejects.toThrow("injected metadata transaction failure");

    expect(bucket.objects.has(storageKey)).toBe(true);
    expect(db.value(
      `users/${userA}/privateDocuments/${reservation.documentId}`,
    )).toMatchObject({
      state: "pending",
      currentVersionId: null,
    });
    expect(db.value(
      `users/${userA}/privateDocuments/${reservation.documentId}/versions/${reservation.versionId}`,
    )).toMatchObject({
      state: "uploading",
      storageKey,
    });
    expect(db.value(`_privateCloudUploadIntents/${reservation.uploadId}`)).toMatchObject({
      state: "uploading",
      storageKey,
    });

    await expect(service.finalizeUpload(userA, reservation.uploadId, {
      checksumSha256: request.checksumSha256,
      idempotencyKey: request.idempotencyKey,
    })).resolves.toMatchObject({
      state: "active",
      verified: true,
      documentId: reservation.documentId,
      versionId: reservation.versionId,
      checksumSha256: request.checksumSha256,
      sizeBytes: request.sizeBytes,
    });
    expect(db.value(
      `users/${userA}/privateDocuments/${reservation.documentId}`,
    )).toMatchObject({
      state: "active",
      currentVersionId: reservation.versionId,
    });
  });

  it("treats a lost activation acknowledgement as committed without regressing active state", async () => {
    const { bucket, db, service } = serviceHarness();
    const request = {
      fileName: "Lost response.pdf",
      sizeBytes: 1_024,
      contentType: "application/pdf",
      checksumSha256: "a".repeat(64),
      idempotencyKey: "upload-attempt-lost-response-0001",
    };
    const reservation = await service.beginUpload(userA, request, "https://pdfenrich.com");
    const storageKey = privateVersionStorageKey(
      userA,
      reservation.documentId,
      reservation.versionId,
    );
    bucket.objects.set(storageKey, {
      generation: "1",
      sha256: request.checksumSha256,
      size: request.sizeBytes,
    });
    db.failAfterCommitCountdown = 3;

    await expect(service.finalizeUpload(userA, reservation.uploadId, {
      checksumSha256: request.checksumSha256,
      idempotencyKey: request.idempotencyKey,
    })).resolves.toMatchObject({
      state: "active",
      verified: true,
      documentId: reservation.documentId,
      versionId: reservation.versionId,
    });

    expect(db.value(
      `users/${userA}/privateDocuments/${reservation.documentId}`,
    )).toMatchObject({
      state: "active",
      currentVersionId: reservation.versionId,
    });
    expect(db.value(
      `users/${userA}/privateDocuments/${reservation.documentId}/versions/${reservation.versionId}`,
    )).toMatchObject({ state: "active" });
    expect(db.value(`_privateCloudUploadIntents/${reservation.uploadId}`)).toMatchObject({
      state: "active",
    });
  });
});

describe("complete document and account deletion", () => {
  it("purges every version, pending upload, share, signing request, object, and metadata record", async () => {
    const storageKey1 = privateVersionStorageKey(userA, documentA, version1);
    const storageKey2 = privateVersionStorageKey(userA, documentA, version2);
    const pendingKey = `users/${encodeURIComponent(userA)}/documents/${documentA}/pending.tmp`;
    const { bucket, db, service } = serviceHarness({
      records: {
        [`users/${userA}/privateDocuments/${documentA}`]:
          activeDocument(userA, documentA, version2, { versionCount: 3 }),
        [`users/${userA}/privateDocuments/${documentA}/versions/${version1}`]:
          activeVersion(userA, documentA, version1, 100, "a".repeat(64)),
        [`users/${userA}/privateDocuments/${documentA}/versions/${version2}`]:
          activeVersion(userA, documentA, version2, 200, "b".repeat(64)),
        [`users/${userA}/privateDocuments/${documentA}/versions/${versionPending}`]: {
          ownerId: userA,
          documentId: documentA,
          versionId: versionPending,
          storageKey: privateVersionStorageKey(userA, documentA, versionPending),
          displayName: "Document.pdf",
          state: "uploading",
          declaredSize: 50,
          createdAt: fakeTimestamp(fixedNow),
          updatedAt: fakeTimestamp(fixedNow),
        },
        [`_privateCloudUsage/${userA}`]: {
          ownerId: userA,
          activeBytes: 300,
          reservedBytes: 50,
          documentCount: 1,
        },
        "_privateCloudUploadIntents/upload-pending": {
          ownerId: userA,
          documentId: documentA,
          declaredSize: 50,
          state: "uploading",
        },
        [`shareLinks/${shareId}`]: {
          ownerId: userA,
          sourceDocumentId: documentA,
          status: "active",
        },
        [`signingRequests/${shareId}`]: {
          ownerId: userA,
          status: "active",
        },
      },
      objects: {
        [storageKey1]: { size: 100 },
        [storageKey2]: { size: 200 },
        [pendingKey]: { size: 50 },
        [`shares/${shareId}/document.pdf`]: { size: 100 },
      },
    });

    await expect(service.purgeDocument(userA, documentA)).resolves.toEqual({
      documentId: documentA,
      state: "deleted",
      deleteConfirmed: true,
      purgeConfirmed: true,
    });

    expect([...db.records.keys()].filter((path) => path.includes(documentA))).toEqual([]);
    expect(db.value(`shareLinks/${shareId}`)).toBeUndefined();
    expect(db.value(`signingRequests/${shareId}`)).toBeUndefined();
    expect(db.value("_privateCloudUploadIntents/upload-pending")).toBeUndefined();
    expect([...bucket.objects.keys()].filter((path) => (
      path.includes(documentA) || path.includes(shareId)
    ))).toEqual([]);
    expect(db.value(`_privateCloudUsage/${userA}`)).toMatchObject({
      activeBytes: 0,
      reservedBytes: 0,
      documentCount: 0,
    });
  });

  it("purges only the requested account and confirms no owned records remain", async () => {
    const keyA = privateVersionStorageKey(userA, documentA, version1);
    const keyB = privateVersionStorageKey(userB, documentB, version1);
    const { bucket, db, service } = serviceHarness({
      records: {
        [`users/${userA}/privateDocuments/${documentA}`]:
          activeDocument(userA, documentA, version1, { versionCount: 1 }),
        [`users/${userA}/privateDocuments/${documentA}/versions/${version1}`]:
          activeVersion(userA, documentA, version1, 100, "a".repeat(64)),
        [`users/${userB}/privateDocuments/${documentB}`]:
          activeDocument(userB, documentB, version1, { versionCount: 1 }),
        [`users/${userB}/privateDocuments/${documentB}/versions/${version1}`]:
          activeVersion(userB, documentB, version1, 100, "a".repeat(64)),
        [`productAnalyticsEvents/event-a`]: { actorId: userA },
        [`productAnalyticsEvents/event-b`]: { actorId: userB },
        [`supportRequests/support-a`]: { actorId: userA },
        [`authUserProfiles/${userA}`]: { uid: userA },
        [`_privateCloudUsage/${userA}`]: { ownerId: userA },
      },
      objects: {
        [keyA]: { size: 100 },
        [keyB]: { size: 100 },
      },
    });

    await expect(service.purgeAccountData(userA, true)).resolves.toEqual({
      state: "complete",
      purgeConfirmed: true,
    });

    expect([...db.records.entries()].filter(([, value]) => (
      value?.ownerId === userA || value?.actorId === userA || value?.uid === userA
    ))).toEqual([]);
    expect([...db.records.keys()].some((path) => path.startsWith(`users/${userA}/`))).toBe(false);
    expect(bucket.objects.has(keyA)).toBe(false);
    expect(bucket.objects.has(keyB)).toBe(true);
    expect(db.value(`users/${userB}/privateDocuments/${documentB}`)).toBeDefined();
    expect(db.value("productAnalyticsEvents/event-b")).toBeDefined();
    expect(db.value(`_privateCloudAccountState/${userA}`)).toMatchObject({
      state: "deleted",
    });
  });
});

describe("account deletion write barrier", () => {
  it.each(["purging", "deleted"])(
    "blocks settings writes, new uploads, and finalization while account state is %s",
    async (accountState) => {
      const { db, service } = serviceHarness();
      const pendingRequest = {
        fileName: "Pending before deletion.pdf",
        sizeBytes: 1_024,
        contentType: "application/pdf",
        checksumSha256: "a".repeat(64),
        idempotencyKey: `upload-before-${accountState}-0001`,
      };
      const reservation = await service.beginUpload(
        userA,
        pendingRequest,
        "https://pdfenrich.com",
      );
      db.records.set(`_privateCloudAccountState/${userA}`, {
        state: accountState,
        purgeOperationId: `op_${"P".repeat(24)}`,
        updatedAt: fakeTimestamp(fixedNow),
      });

      await expect(service.setCloudHistory(userA, true)).rejects.toMatchObject({
        code: "account_deletion_in_progress",
        status: 409,
      });
      await expect(service.beginUpload(userA, {
        ...pendingRequest,
        idempotencyKey: `upload-after-${accountState}-0001`,
      }, "https://pdfenrich.com")).rejects.toMatchObject({
        code: "account_deletion_in_progress",
        status: 409,
      });
      await expect(service.finalizeUpload(userA, reservation.uploadId, {
        checksumSha256: pendingRequest.checksumSha256,
        idempotencyKey: pendingRequest.idempotencyKey,
      })).rejects.toMatchObject({
        code: "account_deletion_in_progress",
        status: 409,
      });

      expect(db.value(`_privateCloudAccountState/${userA}`)).toMatchObject({
        state: accountState,
      });
      expect(db.value(`_privateCloudUploadIntents/${reservation.uploadId}`)).toMatchObject({
        state: "uploading",
        reservationCharged: true,
      });
    },
  );
});

describe("version recovery", () => {
  it("verifies and restores the previous immutable version without deleting the latest version", async () => {
    const priorSha = "a".repeat(64);
    const currentSha = "b".repeat(64);
    const priorKey = privateVersionStorageKey(userA, documentA, version1);
    const currentKey = privateVersionStorageKey(userA, documentA, version2);
    const { db, service } = serviceHarness({
      records: {
        [`users/${userA}/privateDocuments/${documentA}`]:
          activeDocument(userA, documentA, version2),
        [`users/${userA}/privateDocuments/${documentA}/versions/${version1}`]:
          activeVersion(userA, documentA, version1, 100, priorSha),
        [`users/${userA}/privateDocuments/${documentA}/versions/${version2}`]:
          activeVersion(userA, documentA, version2, 200, currentSha),
      },
      objects: {
        [priorKey]: { size: 100, sha256: priorSha, generation: "1" },
        [currentKey]: { size: 200, sha256: currentSha, generation: "1" },
      },
    });

    await expect(service.restoreVersion(userA, documentA, version1)).resolves.toEqual({
      documentId: documentA,
      versionId: version1,
      state: "active",
      restoreConfirmed: true,
    });
    expect(db.value(`users/${userA}/privateDocuments/${documentA}`)).toMatchObject({
      currentVersionId: version1,
      currentSize: 100,
      currentSha256: priorSha,
    });
    expect(db.value(
      `users/${userA}/privateDocuments/${documentA}/versions/${version2}`,
    )).toMatchObject({
      state: "active",
      size: 200,
      sha256: currentSha,
    });
  });
});

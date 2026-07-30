import { createHash, randomBytes as nodeRandomBytes } from "node:crypto";
import { FieldPath, Timestamp } from "firebase-admin/firestore";
import {
  assertChecksum,
  assertStorageQuota,
  contentDispositionForPdf,
  createInternalId,
  encodeVerifiedUserId,
  isInternalDocumentId,
  privateVersionStorageKey,
  PrivateCloudSecurityError,
  uploadIntentKey,
  validateBeginUploadInput,
} from "../security/privateCloudDocumentService.js";
import {
  downloadAndFastInspectPrivatePdf,
  inspectParsedPrivatePdf,
} from "../security/productionPdfInspection.js";

const COLLECTIONS = Object.freeze({
  usage: "_privateCloudUsage",
  uploadIntents: "_privateCloudUploadIntents",
  rateLimits: "_privateCloudRateLimits",
  accountPurgeJobs: "_privateCloudAccountPurgeJobs",
  accountState: "_privateCloudAccountState",
  reconciliation: "_privateCloudReconciliation",
});

const RATE_POLICIES = Object.freeze({
  cloud_history: { maximum: 30, windowSeconds: 60 },
  begin_upload: { maximum: 20, windowSeconds: 60 },
  finalize_upload: { maximum: 30, windowSeconds: 60 },
  list_documents: { maximum: 120, windowSeconds: 60 },
  download_document: { maximum: 120, windowSeconds: 60 },
  mutate_document: { maximum: 30, windowSeconds: 60 },
  purge_account: { maximum: 3, windowSeconds: 60 * 60 },
});

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SHARE_ID_PATTERN = /^(?:[a-f0-9]{64}|[A-Za-z0-9_-]{32})$/;
const OPERATION_ID_PATTERN = /^op_[A-Za-z0-9_-]{24}$/;
const MAX_STORAGE_DELETE_PASSES = 10_000;
const VALIDATION_LEASE_MS = 5 * 60 * 1_000;
const TRUSTED_RESUMABLE_UPLOAD_HOSTS = new Set(["storage.googleapis.com"]);

function nowTimestamp(clock) {
  return Timestamp.fromDate(clock());
}

function timestampDate(value) {
  return value?.toDate?.() || new Date(value || 0);
}

function isoTimestamp(value) {
  const date = timestampDate(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function safeDocumentResponse(snapshot) {
  const value = snapshot.data();
  return {
    documentId: snapshot.id,
    displayName: value.displayName,
    state: value.state,
    currentVersionId: value.currentVersionId || null,
    versionId: value.currentVersionId || null,
    sizeBytes: Number(value.currentSize || 0),
    pageCount: Number(value.pageCount || 0),
    checksumSha256: value.currentSha256 || null,
    versionCount: Number(value.versionCount || 0),
    createdAt: isoTimestamp(value.createdAt),
    updatedAt: isoTimestamp(value.updatedAt),
    retentionUntil: value.retentionUntil ? isoTimestamp(value.retentionUntil) : null,
  };
}

function safeVersionResponse(snapshot) {
  const value = snapshot.data();
  return {
    versionId: snapshot.id,
    state: value.state,
    sizeBytes: Number(value.size || value.declaredSize || 0),
    checksumSha256: value.sha256 || null,
    pageCount: Number(value.pageCount || 0),
    createdAt: isoTimestamp(value.createdAt),
    activatedAt: value.activatedAt ? isoTimestamp(value.activatedAt) : null,
  };
}

function terminalDocumentResponse(documentSnapshot, versionSnapshot, { reused = false } = {}) {
  const document = safeDocumentResponse(documentSnapshot);
  const version = safeVersionResponse(versionSnapshot);
  if (
    document.state !== "active"
    || version.state !== "active"
    || !SHA256_PATTERN.test(String(version.checksumSha256 || ""))
    || version.sizeBytes <= 0
  ) {
    throw new PrivateCloudSecurityError(
      "save_not_verified",
      "The private cloud save has not completed verification.",
      503,
    );
  }
  return {
    state: "active",
    verified: true,
    documentId: document.documentId,
    versionId: version.versionId,
    displayName: document.displayName,
    sizeBytes: version.sizeBytes,
    pageCount: version.pageCount,
    checksumSha256: version.checksumSha256,
    updatedAt: document.updatedAt,
    reused,
  };
}

function requireInternalId(value, prefix) {
  if (!isInternalDocumentId(value, prefix)) {
    throw new PrivateCloudSecurityError(
      `invalid_${prefix}_id`,
      `The ${prefix === "doc" ? "document" : "version"} identifier is invalid.`,
    );
  }
  return value;
}

function requireUploadId(value) {
  const text = String(value || "").toLowerCase();
  if (!SHA256_PATTERN.test(text)) {
    throw new PrivateCloudSecurityError("invalid_upload_id", "The upload identifier is invalid.");
  }
  return text;
}

function requireDocumentState(documentRecord, states) {
  if (!documentRecord || !states.includes(documentRecord.state)) {
    throw new PrivateCloudSecurityError("document_not_available", "The requested document is unavailable.", 404);
  }
}

function isRetryableInfrastructureError(error) {
  if (!(error instanceof PrivateCloudSecurityError)) return true;
  return error.status >= 500 || [408, 425, 429].includes(error.status);
}

async function runInChunks(values, handler, size = 20) {
  for (let index = 0; index < values.length; index += size) {
    await Promise.all(values.slice(index, index + size).map(handler));
  }
}

export function createPrivateCloudDocumentService({
  db,
  bucket,
  scanner,
  config,
  clock = () => new Date(),
  randomBytes,
  fetchImpl = globalThis.fetch,
}) {
  if (!db || !bucket || !scanner || !config) {
    throw new PrivateCloudSecurityError("backend_configuration_missing", "The private cloud backend is not configured.", 503);
  }

  const userRef = (uid) => {
    encodeVerifiedUserId(uid);
    return db.collection("users").doc(uid);
  };
  const documentsCollection = (uid) => userRef(uid).collection("privateDocuments");
  const documentRef = (uid, documentId) => documentsCollection(uid).doc(documentId);
  const versionRef = (uid, documentId, versionId) => documentRef(uid, documentId).collection("versions").doc(versionId);
  const usageRef = (uid) => {
    encodeVerifiedUserId(uid);
    return db.collection(COLLECTIONS.usage).doc(uid);
  };
  const settingsRef = (uid) => userRef(uid).collection("privateCloudSettings").doc("history");
  const uploadIntentRef = (uploadId) => db.collection(COLLECTIONS.uploadIntents).doc(uploadId);
  const accountStateRef = (uid) => {
    encodeVerifiedUserId(uid);
    return db.collection(COLLECTIONS.accountState).doc(uid);
  };
  const secureRandomBytes = randomBytes || nodeRandomBytes;
  const createOperationId = () => {
    const entropy = secureRandomBytes(18);
    if (!(entropy instanceof Uint8Array) || entropy.byteLength !== 18) {
      throw new PrivateCloudSecurityError(
        "invalid_random_source",
        "The secure random source returned invalid entropy.",
        500,
      );
    }
    return `op_${Buffer.from(entropy).toString("base64url")}`;
  };

  function requireAccountActiveSnapshot(snapshot) {
    if (snapshot.exists && snapshot.data()?.state !== "active") {
      throw new PrivateCloudSecurityError(
        "account_deletion_in_progress",
        "This account is being deleted and cannot accept document operations.",
        409,
      );
    }
  }

  async function assertAccountActive(uid) {
    const snapshot = await accountStateRef(uid).get();
    requireAccountActiveSnapshot(snapshot);
  }

  async function enforceRateLimit(uid, operation) {
    encodeVerifiedUserId(uid);
    const policy = RATE_POLICIES[operation];
    if (!policy) throw new PrivateCloudSecurityError("invalid_operation", "The private cloud operation is invalid.", 500);
    const now = clock();
    const windowStart = Math.floor(now.getTime() / (policy.windowSeconds * 1_000));
    const actorHash = createHash("sha256").update(uid).digest("hex");
    const key = createHash("sha256").update(`${uid}\u0000${operation}\u0000${windowStart}`).digest("hex");
    const reference = db.collection(COLLECTIONS.rateLimits).doc(key);
    await db.runTransaction(async (transaction) => {
      const [snapshot, stateSnapshot] = await Promise.all([
        transaction.get(reference),
        transaction.get(accountStateRef(uid)),
      ]);
      if (operation !== "purge_account") requireAccountActiveSnapshot(stateSnapshot);
      const count = Number(snapshot.data()?.count || 0);
      if (count >= policy.maximum) {
        throw new PrivateCloudSecurityError("rate_limit_exceeded", "Too many requests. Try again later.", 429);
      }
      transaction.set(reference, {
        actorHash,
        operation,
        count: count + 1,
        expiresAt: Timestamp.fromMillis(now.getTime() + (policy.windowSeconds + 300) * 1_000),
      });
    });
  }

  async function deleteStoragePrefix(prefix) {
    if (!prefix || !prefix.endsWith("/") && !prefix.endsWith(".pdf")) {
      throw new PrivateCloudSecurityError("invalid_internal_path", "A private storage cleanup path was invalid.", 500);
    }
    for (let pass = 0; pass < MAX_STORAGE_DELETE_PASSES; pass += 1) {
      const [files] = await bucket.getFiles({
        prefix,
        versions: true,
        autoPaginate: false,
        maxResults: 250,
      });
      if (!files.length) return;
      const outcomes = await Promise.allSettled(
        files.map((file) => file.delete({ ignoreNotFound: true })),
      );
      if (outcomes.some((outcome) => outcome.status === "rejected")) {
        throw new PrivateCloudSecurityError(
          "storage_delete_incomplete",
          "Some private document objects could not be deleted.",
          503,
        );
      }
    }
    throw new PrivateCloudSecurityError(
      "storage_delete_incomplete",
      "Private storage cleanup exceeded its safe operation limit.",
      503,
    );
  }

  async function verifyStoragePrefixEmpty(prefix) {
    const [files] = await bucket.getFiles({
      prefix,
      versions: true,
      autoPaginate: false,
      maxResults: 1,
    });
    if (files.length) {
      throw new PrivateCloudSecurityError(
        "storage_delete_unconfirmed",
        "Private storage deletion could not be confirmed.",
        503,
      );
    }
  }

  function requireTrustedResumableUploadUrl(value) {
    let parsed;
    try {
      parsed = new URL(String(value || ""));
    } catch {
      throw new PrivateCloudSecurityError(
        "upload_session_record_invalid",
        "A private upload session record failed validation.",
        500,
      );
    }
    if (
      parsed.protocol !== "https:"
      || !TRUSTED_RESUMABLE_UPLOAD_HOSTS.has(parsed.hostname)
      || !parsed.pathname.startsWith("/upload/")
      || parsed.username
      || parsed.password
    ) {
      throw new PrivateCloudSecurityError(
        "upload_session_record_invalid",
        "A private upload session record failed validation.",
        500,
      );
    }
    return parsed.toString();
  }

  async function closeResumableUploadSession(sessionUrl, storageKey) {
    if (!sessionUrl) return { closed: true, reason: "not_issued" };
    const trustedUrl = requireTrustedResumableUploadUrl(sessionUrl);
    const file = bucket.file(storageKey);
    const [alreadyCompleted] = await file.exists();
    if (alreadyCompleted) return { closed: true, reason: "object_completed" };
    if (typeof fetchImpl !== "function") {
      throw new PrivateCloudSecurityError(
        "upload_session_cancel_unavailable",
        "The private upload session could not be closed.",
        503,
      );
    }

    let response;
    try {
      response = await fetchImpl(trustedUrl, {
        method: "DELETE",
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      const [completedDuringCancellation] = await file.exists();
      if (completedDuringCancellation) {
        return { closed: true, reason: "object_completed" };
      }
      throw new PrivateCloudSecurityError(
        "upload_session_cancel_unconfirmed",
        "The private upload session could not be confirmed closed.",
        503,
      );
    }
    if (
      (response.status >= 200 && response.status < 300)
      || [404, 410, 499].includes(response.status)
    ) {
      return { closed: true, reason: "provider_confirmed" };
    }
    const [completedAfterResponse] = await file.exists();
    if (completedAfterResponse) return { closed: true, reason: "object_completed" };
    throw new PrivateCloudSecurityError(
      "upload_session_cancel_unconfirmed",
      "The private upload session could not be confirmed closed.",
      503,
    );
  }

  async function closeTrackedUploadIntents(uid, query) {
    const snapshot = await query.get();
    await runInChunks(snapshot.docs, async (item) => {
      const intent = item.data();
      if (intent.ownerId !== uid || !intent.uploadSessionUrl) return;
      const documentId = requireInternalId(intent.documentId, "doc");
      const versionId = requireInternalId(intent.versionId, "ver");
      const storageKey = privateVersionStorageKey(uid, documentId, versionId);
      if (intent.storageKey !== storageKey) {
        throw new PrivateCloudSecurityError(
          "storage_key_mismatch",
          "A tracked upload path failed validation.",
          500,
        );
      }
      await closeResumableUploadSession(intent.uploadSessionUrl, storageKey);
      await db.runTransaction(async (transaction) => {
        const fresh = await transaction.get(item.ref);
        if (
          !fresh.exists
          || fresh.data().ownerId !== uid
          || fresh.data().documentId !== documentId
          || fresh.data().versionId !== versionId
          || fresh.data().storageKey !== storageKey
        ) {
          return;
        }
        if (fresh.data().uploadSessionUrl === intent.uploadSessionUrl) {
          transaction.update(item.ref, {
            uploadSessionUrl: null,
            uploadSessionClosedAt: nowTimestamp(clock),
            updatedAt: nowTimestamp(clock),
          });
        }
      });
    }, 10);
    return snapshot;
  }

  async function deleteQueryInBatches(query, batchSize = 250) {
    let total = 0;
    while (true) {
      const snapshot = await query.limit(batchSize).get();
      if (snapshot.empty) return total;
      const batch = db.batch();
      snapshot.docs.forEach((item) => batch.delete(item.ref));
      await batch.commit();
      total += snapshot.size;
    }
  }

  async function revokeAndDeleteShares(uid, { sourceDocumentId = "" } = {}) {
    let query = db.collection("shareLinks").where("ownerId", "==", uid);
    if (sourceDocumentId) query = query.where("sourceDocumentId", "==", sourceDocumentId);
    const snapshot = await query.get();
    if (snapshot.empty) return 0;

    await runInChunks(snapshot.docs, async (share) => {
      await db.runTransaction(async (transaction) => {
        const fresh = await transaction.get(share.ref);
        if (!fresh.exists) return;
        if (
          fresh.data().ownerId !== uid
          || (sourceDocumentId && fresh.data().sourceDocumentId !== sourceDocumentId)
        ) {
          throw new PrivateCloudSecurityError(
            "share_cleanup_forbidden",
            "A linked share cleanup record failed ownership validation.",
            500,
          );
        }
        transaction.update(share.ref, {
          status: "revoked",
          revokedAt: nowTimestamp(clock),
          updatedAt: nowTimestamp(clock),
        });
        transaction.delete(db.collection("signingRequests").doc(share.id));
      });
    }, 20);

    await runInChunks(snapshot.docs, async (share) => {
      if (SHARE_ID_PATTERN.test(share.id)) {
        await deleteStoragePrefix(`shares/${share.id}/`);
        await verifyStoragePrefixEmpty(`shares/${share.id}/`);
      }
      await db.recursiveDelete(share.ref);
      await db.collection("signingRequests").doc(share.id).delete();
    }, 10);
    const remaining = await query.limit(1).get();
    if (!remaining.empty) {
      throw new PrivateCloudSecurityError(
        "share_delete_unconfirmed",
        "Linked share deletion could not be confirmed.",
        503,
      );
    }
    return snapshot.size;
  }

  async function releaseUploadReservation(uid, reservation, { finalState = "failed" } = {}) {
    const documentId = requireInternalId(reservation.documentId, "doc");
    const versionId = requireInternalId(reservation.versionId, "ver");
    const uploadId = requireUploadId(reservation.uploadId || reservation.idempotencyKeyHash);
    const storageKey = privateVersionStorageKey(uid, documentId, versionId);
    if (reservation.storageKey && reservation.storageKey !== storageKey) {
      throw new PrivateCloudSecurityError(
        "storage_key_mismatch",
        "The upload cleanup path failed validation.",
        500,
      );
    }
    const versionReference = versionRef(uid, documentId, versionId);
    const documentReference = documentRef(uid, documentId);
    const intentReference = uploadIntentRef(uploadId);
    const proposedCleanupOperationId = createOperationId();

    const cleanupClaim = await db.runTransaction(async (transaction) => {
      const [versionSnapshot, documentSnapshot, intentSnapshot] = await Promise.all([
        transaction.get(versionReference),
        transaction.get(documentReference),
        transaction.get(intentReference),
      ]);
      const version = versionSnapshot.data() || null;
      const intent = intentSnapshot.data() || null;
      const document = documentSnapshot.data() || null;
      if (!intentSnapshot.exists) {
        throw new PrivateCloudSecurityError(
          "upload_cleanup_metadata_missing",
          "The upload cleanup ledger is unavailable.",
          503,
        );
      }
      const intentMatches = (
        intent.ownerId === uid
        && intent.documentId === documentId
        && intent.versionId === versionId
        && intent.storageKey === storageKey
        && intent.uploadId === uploadId
      );
      const versionMatches = !versionSnapshot.exists || (
        version.ownerId === uid
        && version.documentId === documentId
        && version.versionId === versionId
        && version.storageKey === storageKey
        && version.idempotencyKeyHash === uploadId
      );
      if (!intentMatches || !versionMatches || (document && document.ownerId !== uid)) {
        return { stale: true, active: false };
      }
      if (
        version?.state === "active"
        || intent?.state === "active"
        || document?.currentVersionId === versionId
      ) {
        return { active: true };
      }
      if (intent.reservationCharged === false && intent.state === finalState) {
        return { alreadyReleased: true, active: false };
      }
      if (!["uploading", "validating", "cleanup_pending", "failed"].includes(intent.state)) {
        throw new PrivateCloudSecurityError(
          "upload_cleanup_state_invalid",
          "The upload cleanup ledger is in an invalid state.",
          409,
        );
      }
      const cleanupOperationId = (
        intent.state === "cleanup_pending"
        && OPERATION_ID_PATTERN.test(String(intent.cleanupOperationId || ""))
      )
        ? intent.cleanupOperationId
        : proposedCleanupOperationId;
      const updatedAt = nowTimestamp(clock);
      if (versionSnapshot.exists) {
        transaction.update(versionReference, {
          state: "cleanup_pending",
          cleanupOperationId,
          updatedAt,
        });
      }
      transaction.update(intentReference, {
        state: "cleanup_pending",
        cleanupOperationId,
        updatedAt,
      });
      return {
        active: false,
        cleanupOperationId,
        hadReservedVersion: versionSnapshot.exists,
        reservationCharged: intent.reservationCharged !== false,
        uploadSessionUrl: intent.uploadSessionUrl || null,
        declaredSize: Number(
          version?.declaredSize
          || intent?.declaredSize
          || reservation.declaredSize
          || 0,
        ),
      };
    });

    if (cleanupClaim.stale) return { released: false, active: false, stale: true };
    if (cleanupClaim.alreadyReleased) return { released: false, active: false, alreadyReleased: true };
    if (cleanupClaim.active) return { released: false, active: true };
    if (
      !OPERATION_ID_PATTERN.test(String(cleanupClaim.cleanupOperationId || ""))
      || !Number.isSafeInteger(cleanupClaim.declaredSize)
      || cleanupClaim.declaredSize <= 0
    ) {
      throw new PrivateCloudSecurityError(
        "upload_cleanup_ledger_invalid",
        "The upload cleanup ledger failed validation.",
        500,
      );
    }

    if (cleanupClaim.uploadSessionUrl) {
      await closeResumableUploadSession(cleanupClaim.uploadSessionUrl, storageKey);
    }
    await deleteStoragePrefix(storageKey);
    await verifyStoragePrefixEmpty(storageKey);

    const releaseResult = await db.runTransaction(async (transaction) => {
      const [versionSnapshot, documentSnapshot, usageSnapshot, intentSnapshot, stateSnapshot] = await Promise.all([
        transaction.get(versionReference),
        transaction.get(documentReference),
        transaction.get(usageRef(uid)),
        transaction.get(intentReference),
        transaction.get(accountStateRef(uid)),
      ]);
      if (stateSnapshot.exists && stateSnapshot.data()?.state !== "active") {
        return { released: false, accountPurging: true };
      }
      const freshIntent = intentSnapshot.data() || null;
      const freshVersion = versionSnapshot.data() || null;
      const freshDocument = documentSnapshot.data() || null;
      if (
        !intentSnapshot.exists
        || freshIntent.ownerId !== uid
        || freshIntent.uploadId !== uploadId
        || freshIntent.documentId !== documentId
        || freshIntent.versionId !== versionId
        || freshIntent.storageKey !== storageKey
      ) {
        return { released: false, stale: true };
      }
      if (
        freshVersion?.state === "active"
        || freshIntent.state === "active"
        || freshDocument?.currentVersionId === versionId
      ) {
        throw new PrivateCloudSecurityError(
          "upload_cleanup_race",
          "The upload became active during cleanup.",
          409,
        );
      }
      if (freshIntent.reservationCharged === false && freshIntent.state === finalState) {
        return { released: false, alreadyReleased: true };
      }
      if (
        freshIntent.state !== "cleanup_pending"
        || freshIntent.cleanupOperationId !== cleanupClaim.cleanupOperationId
      ) {
        return { released: false, stale: true };
      }
      if (versionSnapshot.exists && (
        freshVersion.ownerId !== uid
        || freshVersion.documentId !== documentId
        || freshVersion.versionId !== versionId
        || freshVersion.storageKey !== storageKey
        || freshVersion.idempotencyKeyHash !== uploadId
        || freshVersion.state !== "cleanup_pending"
        || freshVersion.cleanupOperationId !== cleanupClaim.cleanupOperationId
      )) {
        return { released: false, stale: true };
      }

      const declaredSize = Number(freshIntent.declaredSize || cleanupClaim.declaredSize);
      const usage = usageSnapshot.data() || {};
      const reservedBytes = Number(usage.reservedBytes || 0);
      const activeBytes = Number(usage.activeBytes || 0);
      const documentCount = Number(usage.documentCount || 0);
      const charged = freshIntent.reservationCharged !== false;
      if (
        (charged && !versionSnapshot.exists)
        ||
        !Number.isSafeInteger(declaredSize)
        || declaredSize <= 0
        || !Number.isSafeInteger(reservedBytes)
        || !Number.isSafeInteger(activeBytes)
        || !Number.isSafeInteger(documentCount)
        || activeBytes < 0
        || documentCount < 0
        || (charged && reservedBytes < declaredSize)
      ) {
        throw new PrivateCloudSecurityError(
          "quota_accounting_mismatch",
          "Private cloud quota accounting requires reconciliation.",
          503,
        );
      }
      const priorVersionCount = Number(freshDocument?.versionCount || 0);
      const removesReservedVersion = versionSnapshot.exists && charged;
      if (
        freshDocument
        && (
          freshDocument.ownerId !== uid
          || !Number.isSafeInteger(priorVersionCount)
          || priorVersionCount < (removesReservedVersion ? 1 : 0)
        )
      ) {
        throw new PrivateCloudSecurityError(
          "quota_accounting_mismatch",
          "Private cloud quota accounting requires reconciliation.",
          503,
        );
      }
      const nextVersionCount = priorVersionCount - (removesReservedVersion ? 1 : 0);
      const removeDocument = Boolean(
        documentSnapshot.exists
        && !freshDocument.currentVersionId
        && nextVersionCount === 0,
      );
      if (removeDocument && documentCount < 1) {
        throw new PrivateCloudSecurityError(
          "quota_accounting_mismatch",
          "Private cloud quota accounting requires reconciliation.",
          503,
        );
      }

      if (versionSnapshot.exists) transaction.delete(versionReference);
      if (removeDocument) {
        transaction.delete(documentReference);
      } else if (documentSnapshot.exists) {
        transaction.update(documentReference, {
          state: freshDocument.currentVersionId ? "active" : "failed",
          versionCount: nextVersionCount,
          updatedAt: nowTimestamp(clock),
        });
      }
      transaction.set(usageRef(uid), {
        ownerId: uid,
        activeBytes,
        reservedBytes: reservedBytes - (charged ? declaredSize : 0),
        documentCount: documentCount - (removeDocument ? 1 : 0),
        updatedAt: nowTimestamp(clock),
      }, { merge: true });
      transaction.update(intentReference, {
        state: finalState,
        reservationCharged: false,
        uploadSessionUrl: null,
        cleanupCompletedAt: nowTimestamp(clock),
        updatedAt: nowTimestamp(clock),
        expiresAt: Timestamp.fromMillis(clock().getTime() + 24 * 60 * 60 * 1_000),
      });
      return { released: charged, stale: false };
    });
    return { ...releaseResult, active: false };
  }

  async function activeUploadResult(uid, intent, reused = true) {
    const [documentSnapshot, versionSnapshot] = await Promise.all([
      documentRef(uid, intent.documentId).get(),
      versionRef(uid, intent.documentId, intent.versionId).get(),
    ]);
    if (!documentSnapshot.exists || !versionSnapshot.exists) {
      throw new PrivateCloudSecurityError(
        "save_not_verified",
        "The saved document metadata is unavailable.",
        503,
      );
    }
    return terminalDocumentResponse(documentSnapshot, versionSnapshot, { reused });
  }

  async function getCloudHistory(uid) {
    await enforceRateLimit(uid, "cloud_history");
    await assertAccountActive(uid);
    const snapshot = await settingsRef(uid).get();
    return {
      enabled: snapshot.exists && snapshot.data().enabled === true,
      updatedAt: snapshot.exists ? isoTimestamp(snapshot.data().updatedAt) : null,
    };
  }

  async function setCloudHistory(uid, enabled) {
    await enforceRateLimit(uid, "cloud_history");
    const value = enabled === true;
    await db.runTransaction(async (transaction) => {
      const stateSnapshot = await transaction.get(accountStateRef(uid));
      requireAccountActiveSnapshot(stateSnapshot);
      transaction.set(settingsRef(uid), {
        ownerId: uid,
        enabled: value,
        updatedAt: nowTimestamp(clock),
      }, { merge: true });
    });
    return { enabled: value, updatedAt: clock().toISOString() };
  }

  async function beginUpload(uid, rawInput, origin) {
    await enforceRateLimit(uid, "begin_upload");
    const input = validateBeginUploadInput(rawInput, { maximumFileBytes: config.maximumFileBytes });
    const uploadId = uploadIntentKey(uid, input.idempotencyKey);
    const intentReference = uploadIntentRef(uploadId);
    const existingIntentSnapshot = await intentReference.get();
    if (
      existingIntentSnapshot.exists
      && ["uploading", "validating", "cleanup_pending"].includes(existingIntentSnapshot.data().state)
      && timestampDate(existingIntentSnapshot.data().expiresAt).getTime() <= clock().getTime()
    ) {
      await releaseUploadReservation(uid, {
        ...existingIntentSnapshot.data(),
        uploadId,
      });
    }

    const candidateDocumentId = input.documentId || createInternalId("doc", randomBytes);
    const candidateVersionId = createInternalId("ver", randomBytes);
    const now = clock();
    const reservation = await db.runTransaction(async (transaction) => {
      const [intentSnapshot, stateSnapshot] = await Promise.all([
        transaction.get(intentReference),
        transaction.get(accountStateRef(uid)),
      ]);
      requireAccountActiveSnapshot(stateSnapshot);
      if (intentSnapshot.exists) {
        const intent = intentSnapshot.data();
        const exactMatch = (
          intent.ownerId === uid
          && Number(intent.declaredSize) === input.declaredSize
          && intent.displayName === input.displayName
          && intent.expectedSha256 === input.expectedSha256
          && (intent.requestedDocumentId || null) === (input.documentId || null)
        );
        if (!exactMatch) {
          throw new PrivateCloudSecurityError(
            "idempotency_conflict",
            "This idempotency key was already used for a different upload.",
            409,
          );
        }
        if (intent.state === "active") return { ...intent, uploadId, reused: true, alreadyFinalized: true };
        if (
          ["uploading", "validating"].includes(intent.state)
          && timestampDate(intent.expiresAt).getTime() > now.getTime()
        ) {
          return { ...intent, uploadId, reused: true, alreadyFinalized: false };
        }
        if (intent.state === "cleanup_pending") {
          throw new PrivateCloudSecurityError(
            "upload_cleanup_pending",
            "The prior upload cleanup has not completed. Try again shortly.",
            503,
          );
        }
        if (intent.state !== "failed") {
          throw new PrivateCloudSecurityError(
            "upload_intent_conflict",
            "The upload intent is unavailable.",
            409,
          );
        }
      }

      const selectedDocumentReference = documentRef(uid, candidateDocumentId);
      const [documentSnapshot, usageSnapshot] = await Promise.all([
        transaction.get(selectedDocumentReference),
        transaction.get(usageRef(uid)),
      ]);
      const existingDocument = documentSnapshot.exists ? documentSnapshot.data() : null;
      if (input.documentId) {
        if (!existingDocument || existingDocument.ownerId !== uid) {
          throw new PrivateCloudSecurityError("document_not_found", "The requested document is unavailable.", 404);
        }
        requireDocumentState(existingDocument, ["active"]);
      } else if (existingDocument) {
        throw new PrivateCloudSecurityError(
          "internal_id_collision",
          "A secure document identifier collided. Retry the upload.",
          503,
        );
      }

      const usage = usageSnapshot.data() || {};
      assertStorageQuota({
        usage,
        declaredSize: input.declaredSize,
        createsDocument: !existingDocument,
        existingVersionCount: Number(existingDocument?.versionCount || 0),
        maximumAccountBytes: config.maximumAccountBytes,
      });

      const storageKey = privateVersionStorageKey(uid, candidateDocumentId, candidateVersionId);
      const createdAt = Timestamp.fromDate(now);
      const expiresAt = Timestamp.fromMillis(now.getTime() + 24 * 60 * 60 * 1_000);
      const documentRecord = existingDocument || {
        ownerId: uid,
        documentId: candidateDocumentId,
        displayName: input.displayName,
        state: "pending",
        currentVersionId: null,
        currentSize: 0,
        currentSha256: null,
        pageCount: 0,
        versionCount: 0,
        createdAt,
        deletedAt: null,
        retentionUntil: null,
      };
      transaction.set(selectedDocumentReference, {
        ...documentRecord,
        versionCount: Number(documentRecord.versionCount || 0) + 1,
        updatedAt: createdAt,
      });
      transaction.create(versionRef(uid, candidateDocumentId, candidateVersionId), {
        ownerId: uid,
        documentId: candidateDocumentId,
        versionId: candidateVersionId,
        storageKey,
        displayName: input.displayName,
        state: "uploading",
        declaredSize: input.declaredSize,
        contentType: input.contentType,
        expectedSha256: input.expectedSha256,
        idempotencyKeyHash: uploadId,
        createdAt,
        updatedAt: createdAt,
        expiresAt,
        reservationCharged: true,
      });
      transaction.set(usageRef(uid), {
        ownerId: uid,
        activeBytes: Math.max(0, Number(usage.activeBytes || 0)),
        reservedBytes: Math.max(0, Number(usage.reservedBytes || 0)) + input.declaredSize,
        documentCount: Math.max(0, Number(usage.documentCount || 0)) + (existingDocument ? 0 : 1),
        updatedAt: createdAt,
      }, { merge: true });
      transaction.set(intentReference, {
        ownerId: uid,
        uploadId,
        documentId: candidateDocumentId,
        requestedDocumentId: input.documentId || null,
        versionId: candidateVersionId,
        storageKey,
        displayName: input.displayName,
        declaredSize: input.declaredSize,
        contentType: input.contentType,
        expectedSha256: input.expectedSha256,
        state: "uploading",
        createdAt,
        updatedAt: createdAt,
        expiresAt,
        reservationCharged: true,
        uploadSessionUrl: null,
      });
      return {
        ownerId: uid,
        uploadId,
        documentId: candidateDocumentId,
        requestedDocumentId: input.documentId || null,
        versionId: candidateVersionId,
        storageKey,
        displayName: input.displayName,
        declaredSize: input.declaredSize,
        expectedSha256: input.expectedSha256,
        state: "uploading",
        reused: false,
        alreadyFinalized: false,
        expiresAt,
        reservationCharged: true,
        uploadSessionUrl: null,
      };
    });

    if (reservation.alreadyFinalized) return activeUploadResult(uid, reservation, true);

    const file = bucket.file(privateVersionStorageKey(uid, reservation.documentId, reservation.versionId));
    try {
      const [exists] = await file.exists();
      if (exists) {
        return {
          uploadId,
          documentId: reservation.documentId,
          versionId: reservation.versionId,
          state: "ready_to_finalize",
          expiresAt: isoTimestamp(reservation.expiresAt),
          reused: true,
        };
      }
      if (reservation.uploadSessionUrl) {
        return {
          uploadId,
          documentId: reservation.documentId,
          versionId: reservation.versionId,
          state: "uploading",
          uploadSessionUrl: reservation.uploadSessionUrl,
          expiresAt: isoTimestamp(reservation.expiresAt),
          sizeBytes: Number(reservation.declaredSize),
          reused: true,
        };
      }
      const [uploadSessionUrl] = await file.createResumableUpload({
        origin: origin || undefined,
        metadata: {
          contentType: "application/pdf",
          cacheControl: "private, no-store, max-age=0",
          metadata: {
            uploadId,
            documentId: reservation.documentId,
            versionId: reservation.versionId,
          },
        },
        preconditionOpts: { ifGenerationMatch: 0 },
      });
      try {
        await db.runTransaction(async (transaction) => {
          const [freshIntent, freshVersion, freshDocument, stateSnapshot] = await Promise.all([
            transaction.get(intentReference),
            transaction.get(versionRef(uid, reservation.documentId, reservation.versionId)),
            transaction.get(documentRef(uid, reservation.documentId)),
            transaction.get(accountStateRef(uid)),
          ]);
          requireAccountActiveSnapshot(stateSnapshot);
          if (
            !freshIntent.exists
            || !freshVersion.exists
            || !freshDocument.exists
            || freshIntent.data().ownerId !== uid
            || freshVersion.data().ownerId !== uid
            || freshDocument.data().ownerId !== uid
            || freshIntent.data().documentId !== reservation.documentId
            || freshIntent.data().versionId !== reservation.versionId
            || freshIntent.data().storageKey !== reservation.storageKey
            || freshVersion.data().storageKey !== reservation.storageKey
            || freshIntent.data().state !== "uploading"
            || freshVersion.data().state !== "uploading"
            || !["pending", "active", "failed"].includes(freshDocument.data().state)
          ) {
            throw new PrivateCloudSecurityError(
              "upload_session_tracking_conflict",
              "The private upload session could not be attached to its reservation.",
              409,
            );
          }
          transaction.update(intentReference, {
            uploadSessionUrl,
            uploadSessionCreatedAt: nowTimestamp(clock),
            updatedAt: nowTimestamp(clock),
          });
        });
      } catch (trackingError) {
        const reread = await intentReference.get().catch(() => null);
        const trackingWasCommitted = Boolean(
          reread?.exists
          && reread.data().ownerId === uid
          && reread.data().documentId === reservation.documentId
          && reread.data().versionId === reservation.versionId
          && reread.data().storageKey === reservation.storageKey
          && reread.data().uploadSessionUrl === uploadSessionUrl
        );
        if (!trackingWasCommitted) {
          try {
            await closeResumableUploadSession(uploadSessionUrl, reservation.storageKey);
          } catch (cancellationError) {
            await intentReference.update({
              state: "cleanup_pending",
              uploadSessionUrl,
              cleanupOperationId: createOperationId(),
              updatedAt: nowTimestamp(clock),
            }).catch(() => {});
            throw cancellationError;
          }
          throw trackingError;
        }
      }
      return {
        uploadId,
        documentId: reservation.documentId,
        versionId: reservation.versionId,
        state: "uploading",
        uploadSessionUrl,
        expiresAt: isoTimestamp(reservation.expiresAt),
        sizeBytes: Number(reservation.declaredSize),
        reused: reservation.reused,
      };
    } catch (error) {
      if (error instanceof PrivateCloudSecurityError) throw error;
      throw new PrivateCloudSecurityError(
        "upload_session_failed",
        "A private upload session could not be created.",
        503,
      );
    }
  }

  async function finalizeUpload(uid, uploadIdValue, {
    checksumSha256,
    idempotencyKey,
  } = {}) {
    await enforceRateLimit(uid, "finalize_upload");
    const uploadId = requireUploadId(uploadIdValue);
    if (uploadIntentKey(uid, idempotencyKey) !== uploadId) {
      throw new PrivateCloudSecurityError("upload_not_found", "The upload reservation is unavailable.", 404);
    }
    const checksum = String(checksumSha256 || "").toLowerCase();
    if (!SHA256_PATTERN.test(checksum)) {
      throw new PrivateCloudSecurityError("invalid_checksum", "The expected SHA-256 checksum is invalid.");
    }

    const intentReference = uploadIntentRef(uploadId);
    const intentSnapshot = await intentReference.get();
    if (!intentSnapshot.exists || intentSnapshot.data().ownerId !== uid) {
      throw new PrivateCloudSecurityError("upload_not_found", "The upload reservation is unavailable.", 404);
    }
    const intent = { ...intentSnapshot.data(), uploadId };
    if (intent.expectedSha256 !== checksum) {
      throw new PrivateCloudSecurityError(
        "idempotency_conflict",
        "The upload checksum does not match its reservation.",
        409,
      );
    }
    if (intent.state === "active") return activeUploadResult(uid, intent, true);
    if (!["uploading", "validating"].includes(intent.state)) {
      throw new PrivateCloudSecurityError("upload_not_finalizable", "The upload cannot be finalized.", 409);
    }

    const documentId = requireInternalId(intent.documentId, "doc");
    const versionId = requireInternalId(intent.versionId, "ver");
    const storageKey = privateVersionStorageKey(uid, documentId, versionId);
    if (intent.storageKey !== storageKey) {
      throw new PrivateCloudSecurityError("storage_key_mismatch", "The stored upload path failed validation.", 500);
    }
    const documentReference = documentRef(uid, documentId);
    const versionReference = versionRef(uid, documentId, versionId);
    const proposedValidationAttemptId = createOperationId();
    const transition = await db.runTransaction(async (transaction) => {
      const [freshIntent, freshDocument, freshVersion, stateSnapshot] = await Promise.all([
        transaction.get(intentReference),
        transaction.get(documentReference),
        transaction.get(versionReference),
        transaction.get(accountStateRef(uid)),
      ]);
      requireAccountActiveSnapshot(stateSnapshot);
      if (!freshIntent.exists || !freshDocument.exists || !freshVersion.exists) {
        throw new PrivateCloudSecurityError("upload_not_found", "The upload reservation is unavailable.", 404);
      }
      if (
        freshIntent.data().ownerId !== uid
        || freshDocument.data().ownerId !== uid
        || freshVersion.data().ownerId !== uid
      ) {
        throw new PrivateCloudSecurityError("upload_not_found", "The upload reservation is unavailable.", 404);
      }
      if (
        freshIntent.data().state === "active"
        && freshVersion.data().state === "active"
        && freshDocument.data().currentVersionId === versionId
      ) {
        return { alreadyActive: true };
      }
      if (
        !["uploading", "validating"].includes(freshIntent.data().state)
        || !["uploading", "validating"].includes(freshVersion.data().state)
      ) {
        throw new PrivateCloudSecurityError("upload_not_finalizable", "The upload cannot be finalized.", 409);
      }
      if (
        freshIntent.data().storageKey !== storageKey
        || freshVersion.data().storageKey !== storageKey
        || freshIntent.data().expectedSha256 !== checksum
        || freshVersion.data().expectedSha256 !== checksum
      ) {
        throw new PrivateCloudSecurityError("storage_key_mismatch", "The stored upload path failed validation.", 500);
      }
      const existingLeaseUntil = timestampDate(freshIntent.data().validationLeaseUntil).getTime();
      if (
        freshIntent.data().state === "validating"
        && freshVersion.data().state === "validating"
        && OPERATION_ID_PATTERN.test(String(freshIntent.data().validationAttemptId || ""))
        && freshIntent.data().validationAttemptId === freshVersion.data().validationAttemptId
        && existingLeaseUntil > clock().getTime()
      ) {
        return { alreadyActive: false, inProgress: true };
      }
      const updatedAt = nowTimestamp(clock);
      const validationLeaseUntil = Timestamp.fromMillis(clock().getTime() + VALIDATION_LEASE_MS);
      transaction.update(versionReference, {
        state: "validating",
        validationAttemptId: proposedValidationAttemptId,
        validationLeaseUntil,
        updatedAt,
      });
      transaction.update(intentReference, {
        state: "validating",
        validationAttemptId: proposedValidationAttemptId,
        validationLeaseUntil,
        updatedAt,
      });
      return {
        alreadyActive: false,
        inProgress: false,
        validationAttemptId: proposedValidationAttemptId,
      };
    });
    if (transition.alreadyActive) return activeUploadResult(uid, intent, true);
    if (transition.inProgress) {
      throw new PrivateCloudSecurityError(
        "upload_validation_in_progress",
        "This upload is already being verified. Try again shortly.",
        409,
      );
    }
    const validationAttemptId = transition.validationAttemptId;

    let inspection;
    let parsed;
    let scan;
    try {
      inspection = await downloadAndFastInspectPrivatePdf(bucket.file(storageKey), {
        expectedSize: Number(intent.declaredSize),
        maximumFileBytes: config.maximumFileBytes,
      });
      assertChecksum(intent.expectedSha256, inspection.sha256);
      assertChecksum(checksum, inspection.sha256);
      scan = await scanner.scan({
        bucketName: bucket.name,
        storageKey,
        generation: inspection.generation,
        sha256: inspection.sha256,
      });
      parsed = await inspectParsedPrivatePdf(inspection.bytes);
    } catch (error) {
      if (isRetryableInfrastructureError(error)) {
        let concurrentActivationCommitted = false;
        try {
          await db.runTransaction(async (transaction) => {
            const [freshIntent, freshDocument, freshVersion, stateSnapshot] = await Promise.all([
              transaction.get(intentReference),
              transaction.get(documentReference),
              transaction.get(versionReference),
              transaction.get(accountStateRef(uid)),
            ]);
            concurrentActivationCommitted = Boolean(
              freshIntent.exists
              && freshDocument.exists
              && freshVersion.exists
              && freshIntent.data().ownerId === uid
              && freshDocument.data().ownerId === uid
              && freshVersion.data().ownerId === uid
              && freshIntent.data().state === "active"
              && freshVersion.data().state === "active"
              && freshDocument.data().currentVersionId === versionId
            );
            if (concurrentActivationCommitted) return;
            if (stateSnapshot.exists && stateSnapshot.data()?.state !== "active") return;
            const updatedAt = nowTimestamp(clock);
            if (
              freshVersion.exists
              && freshVersion.data().state === "validating"
              && freshVersion.data().validationAttemptId === validationAttemptId
            ) {
              transaction.update(versionReference, {
                state: "uploading",
                validationAttemptId: null,
                validationLeaseUntil: null,
                updatedAt,
              });
            }
            if (
              freshIntent.exists
              && freshIntent.data().state === "validating"
              && freshIntent.data().validationAttemptId === validationAttemptId
            ) {
              transaction.update(intentReference, {
                state: "uploading",
                validationAttemptId: null,
                validationLeaseUntil: null,
                updatedAt,
              });
            }
          });
        } catch {
          // Keep the validation state for reconciliation rather than
          // overwriting a possible concurrent activation.
        }
        if (concurrentActivationCommitted) return activeUploadResult(uid, intent, true);
      } else {
        await releaseUploadReservation(uid, intent);
      }
      throw error;
    }

    try {
      await db.runTransaction(async (transaction) => {
        const [freshIntent, freshDocument, freshVersion, usageSnapshot, stateSnapshot] = await Promise.all([
          transaction.get(intentReference),
          transaction.get(documentReference),
          transaction.get(versionReference),
          transaction.get(usageRef(uid)),
          transaction.get(accountStateRef(uid)),
        ]);
        requireAccountActiveSnapshot(stateSnapshot);
        if (!freshIntent.exists || !freshDocument.exists || !freshVersion.exists) {
          throw new PrivateCloudSecurityError("upload_not_found", "The upload reservation is unavailable.", 404);
        }
        if (
          freshIntent.data().ownerId !== uid
          || freshDocument.data().ownerId !== uid
          || freshVersion.data().ownerId !== uid
        ) {
          throw new PrivateCloudSecurityError("upload_not_found", "The upload reservation is unavailable.", 404);
        }
        if (freshIntent.data().state === "active" && freshVersion.data().state === "active") return;
        requireDocumentState(freshDocument.data(), ["pending", "active", "failed"]);
        if (
          freshIntent.data().state !== "validating"
          || freshVersion.data().state !== "validating"
          || freshIntent.data().validationAttemptId !== validationAttemptId
          || freshVersion.data().validationAttemptId !== validationAttemptId
        ) {
          throw new PrivateCloudSecurityError("upload_not_finalizable", "The upload cannot be finalized.", 409);
        }
        if (
          freshVersion.data().storageKey !== storageKey
          || freshVersion.data().expectedSha256 !== inspection.sha256
        ) {
          throw new PrivateCloudSecurityError("storage_key_mismatch", "The stored upload path failed validation.", 500);
        }

        const activatedAt = nowTimestamp(clock);
        transaction.update(versionReference, {
          state: "active",
          size: inspection.size,
          sha256: inspection.sha256,
          pageCount: parsed.pageCount,
          generation: inspection.generation,
          malwareScanStatus: scan.status,
          malwareScannerVersion: String(scan.engineVersion || "").slice(0, 80),
          reservationCharged: false,
          validationAttemptId: null,
          validationLeaseUntil: null,
          activatedAt,
          updatedAt: activatedAt,
        });
        transaction.update(documentReference, {
          state: "active",
          displayName: freshVersion.data().displayName,
          currentVersionId: versionId,
          currentSize: inspection.size,
          currentSha256: inspection.sha256,
          pageCount: parsed.pageCount,
          deletedAt: null,
          retentionUntil: null,
          updatedAt: activatedAt,
        });
        const usage = usageSnapshot.data() || {};
        const declaredSize = Number(freshIntent.data().declaredSize || 0);
        const reservedBytes = Number(usage.reservedBytes || 0);
        const activeBytes = Number(usage.activeBytes || 0);
        if (
          freshIntent.data().reservationCharged === false
          || !Number.isSafeInteger(declaredSize)
          || declaredSize <= 0
          || !Number.isSafeInteger(reservedBytes)
          || reservedBytes < declaredSize
          || !Number.isSafeInteger(activeBytes)
          || activeBytes < 0
        ) {
          throw new PrivateCloudSecurityError(
            "quota_accounting_mismatch",
            "Private cloud quota accounting requires reconciliation.",
            503,
          );
        }
        transaction.set(usageRef(uid), {
          ownerId: uid,
          activeBytes: activeBytes + inspection.size,
          reservedBytes: reservedBytes - declaredSize,
          updatedAt: activatedAt,
        }, { merge: true });
        transaction.update(intentReference, {
          state: "active",
          generation: inspection.generation,
          size: inspection.size,
          sha256: inspection.sha256,
          pageCount: parsed.pageCount,
          reservationCharged: false,
          uploadSessionUrl: null,
          validationAttemptId: null,
          validationLeaseUntil: null,
          activatedAt,
          updatedAt: activatedAt,
        });
        transaction.set(settingsRef(uid), {
          ownerId: uid,
          enabled: true,
          updatedAt: activatedAt,
        }, { merge: true });
      });
    } catch (error) {
      let activationCommitted = false;
      try {
        await db.runTransaction(async (transaction) => {
          const [freshIntent, freshDocument, freshVersion, stateSnapshot] = await Promise.all([
            transaction.get(intentReference),
            transaction.get(documentReference),
            transaction.get(versionReference),
            transaction.get(accountStateRef(uid)),
          ]);
          activationCommitted = Boolean(
            freshIntent.exists
            && freshDocument.exists
            && freshVersion.exists
            && freshIntent.data().ownerId === uid
            && freshDocument.data().ownerId === uid
            && freshVersion.data().ownerId === uid
            && freshIntent.data().state === "active"
            && freshVersion.data().state === "active"
            && freshDocument.data().state === "active"
            && freshDocument.data().currentVersionId === versionId
            && freshVersion.data().storageKey === storageKey
            && freshVersion.data().sha256 === inspection.sha256
            && String(freshVersion.data().generation || "") === inspection.generation
          );
          if (activationCommitted) return;
          if (stateSnapshot.exists && stateSnapshot.data()?.state !== "active") return;
          const updatedAt = nowTimestamp(clock);
          if (
            freshVersion.exists
            && freshVersion.data().state === "validating"
            && freshVersion.data().validationAttemptId === validationAttemptId
          ) {
            transaction.update(versionReference, {
              state: "uploading",
              validationAttemptId: null,
              validationLeaseUntil: null,
              updatedAt,
            });
          }
          if (
            freshIntent.exists
            && freshIntent.data().state === "validating"
            && freshIntent.data().validationAttemptId === validationAttemptId
          ) {
            transaction.update(intentReference, {
              state: "uploading",
              validationAttemptId: null,
              validationLeaseUntil: null,
              updatedAt,
            });
          }
        });
      } catch {
        // Preserve the original failure. Reconciliation will handle any
        // non-active validation state without overwriting an active commit.
      }
      if (activationCommitted) return activeUploadResult(uid, intent, true);
      throw error;
    }
    return activeUploadResult(uid, intent, false);
  }

  async function listDocuments(uid, { limit = 50, cursor = "", includeDeleted = false } = {}) {
    await enforceRateLimit(uid, "list_documents");
    const boundedLimit = Math.max(1, Math.min(100, Number(limit) || 50));
    const states = includeDeleted ? ["active", "trashed"] : ["active"];
    let query = documentsCollection(uid)
      .where("state", "in", states)
      .orderBy("updatedAt", "desc")
      .limit(boundedLimit + 1);
    if (cursor) {
      requireInternalId(cursor, "doc");
      const cursorSnapshot = await documentRef(uid, cursor).get();
      if (
        !cursorSnapshot.exists
        || cursorSnapshot.data().ownerId !== uid
        || !states.includes(cursorSnapshot.data().state)
      ) {
        throw new PrivateCloudSecurityError("invalid_cursor", "The document cursor is invalid.");
      }
      query = query.startAfter(cursorSnapshot);
    }
    const snapshot = await query.get();
    const page = snapshot.docs.slice(0, boundedLimit);
    return {
      documents: page.map(safeDocumentResponse),
      nextCursor: snapshot.docs.length > boundedLimit ? page.at(-1)?.id || null : null,
    };
  }

  async function listVersions(uid, documentId, { limit = 100 } = {}) {
    await enforceRateLimit(uid, "list_documents");
    requireInternalId(documentId, "doc");
    const documentSnapshot = await documentRef(uid, documentId).get();
    if (!documentSnapshot.exists || documentSnapshot.data().ownerId !== uid) {
      throw new PrivateCloudSecurityError("document_not_found", "The requested document is unavailable.", 404);
    }
    requireDocumentState(documentSnapshot.data(), ["active", "trashed"]);
    const snapshot = await documentRef(uid, documentId)
      .collection("versions")
      .where("state", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(Math.max(1, Math.min(100, Number(limit) || 100)))
      .get();
    return {
      documentId,
      currentVersionId: documentSnapshot.data().currentVersionId,
      versions: snapshot.docs.map(safeVersionResponse),
    };
  }

  async function authorizedVersion(
    uid,
    documentId,
    requestedVersionId = "",
    { allowedDocumentStates = ["active"] } = {},
  ) {
    requireInternalId(documentId, "doc");
    const documentSnapshot = await documentRef(uid, documentId).get();
    if (!documentSnapshot.exists || documentSnapshot.data().ownerId !== uid) {
      throw new PrivateCloudSecurityError("document_not_found", "The requested document is unavailable.", 404);
    }
    requireDocumentState(documentSnapshot.data(), allowedDocumentStates);
    const versionId = requestedVersionId || documentSnapshot.data().currentVersionId;
    requireInternalId(versionId, "ver");
    const versionSnapshot = await versionRef(uid, documentId, versionId).get();
    if (
      !versionSnapshot.exists
      || versionSnapshot.data().ownerId !== uid
      || versionSnapshot.data().state !== "active"
    ) {
      throw new PrivateCloudSecurityError("version_not_found", "The requested document version is unavailable.", 404);
    }
    const expectedStorageKey = privateVersionStorageKey(uid, documentId, versionId);
    if (versionSnapshot.data().storageKey !== expectedStorageKey) {
      throw new PrivateCloudSecurityError("storage_key_mismatch", "The stored document path failed validation.", 500);
    }
    const generation = String(versionSnapshot.data().generation || "");
    if (!generation) {
      throw new PrivateCloudSecurityError("document_generation_mismatch", "The private document generation is unavailable.", 503);
    }
    return {
      document: documentSnapshot.data(),
      version: versionSnapshot.data(),
      file: bucket.file(expectedStorageKey, { generation: Number(generation) }),
      contentDisposition: contentDispositionForPdf(documentSnapshot.data().displayName),
    };
  }

  async function prepareDownload(uid, documentId, versionId) {
    await enforceRateLimit(uid, "download_document");
    return authorizedVersion(uid, documentId, versionId);
  }

  async function verifyStoredVersion(
    uid,
    documentId,
    versionId,
    { allowedDocumentStates = ["active"] } = {},
  ) {
    const authorized = await authorizedVersion(uid, documentId, versionId, {
      allowedDocumentStates,
    });
    const inspection = await downloadAndFastInspectPrivatePdf(authorized.file, {
      expectedSize: Number(authorized.version.size),
      expectedGeneration: String(authorized.version.generation || ""),
      maximumFileBytes: config.maximumFileBytes,
    });
    assertChecksum(authorized.version.sha256, inspection.sha256);
    return { ...authorized, inspection };
  }

  async function trashDocument(uid, documentId) {
    await enforceRateLimit(uid, "mutate_document");
    requireInternalId(documentId, "doc");
    const reference = documentRef(uid, documentId);
    await db.runTransaction(async (transaction) => {
      const [snapshot, stateSnapshot] = await Promise.all([
        transaction.get(reference),
        transaction.get(accountStateRef(uid)),
      ]);
      requireAccountActiveSnapshot(stateSnapshot);
      if (!snapshot.exists || snapshot.data().ownerId !== uid) {
        throw new PrivateCloudSecurityError("document_not_found", "The requested document is unavailable.", 404);
      }
      if (snapshot.data().state === "trashed") return;
      requireDocumentState(snapshot.data(), ["active"]);
      const now = clock();
      transaction.update(reference, {
        state: "trashed",
        deletedAt: Timestamp.fromDate(now),
        retentionUntil: Timestamp.fromMillis(now.getTime() + config.trashRetentionDays * 86_400_000),
        updatedAt: Timestamp.fromDate(now),
      });
    });
    await revokeAndDeleteShares(uid, { sourceDocumentId: documentId });
    return { documentId, state: "trashed", deleteConfirmed: true };
  }

  async function restoreDocument(uid, documentId) {
    await enforceRateLimit(uid, "mutate_document");
    requireInternalId(documentId, "doc");
    const reference = documentRef(uid, documentId);
    const initial = await reference.get();
    if (!initial.exists || initial.data().ownerId !== uid) {
      throw new PrivateCloudSecurityError("document_not_found", "The requested document is unavailable.", 404);
    }
    requireDocumentState(initial.data(), ["trashed"]);
    if (timestampDate(initial.data().retentionUntil).getTime() <= clock().getTime()) {
      throw new PrivateCloudSecurityError("restore_window_expired", "This document can no longer be restored.", 410);
    }
    await verifyStoredVersion(uid, documentId, initial.data().currentVersionId, {
      allowedDocumentStates: ["trashed"],
    });
    await db.runTransaction(async (transaction) => {
      const [snapshot, currentVersion, stateSnapshot] = await Promise.all([
        transaction.get(reference),
        transaction.get(versionRef(uid, documentId, initial.data().currentVersionId)),
        transaction.get(accountStateRef(uid)),
      ]);
      requireAccountActiveSnapshot(stateSnapshot);
      if (!snapshot.exists || snapshot.data().ownerId !== uid) {
        throw new PrivateCloudSecurityError("document_not_found", "The requested document is unavailable.", 404);
      }
      requireDocumentState(snapshot.data(), ["trashed"]);
      if (
        timestampDate(snapshot.data().retentionUntil).getTime() <= clock().getTime()
        || !currentVersion.exists
        || currentVersion.data().ownerId !== uid
        || currentVersion.data().state !== "active"
      ) {
        throw new PrivateCloudSecurityError("restore_window_expired", "This document can no longer be restored.", 410);
      }
      transaction.update(reference, {
        state: "active",
        deletedAt: null,
        retentionUntil: null,
        updatedAt: nowTimestamp(clock),
      });
    });
    return { documentId, state: "active", restoreConfirmed: true };
  }

  async function restoreVersion(uid, documentId, versionId) {
    await enforceRateLimit(uid, "mutate_document");
    requireInternalId(documentId, "doc");
    requireInternalId(versionId, "ver");
    const verified = await verifyStoredVersion(uid, documentId, versionId);
    const documentReference = documentRef(uid, documentId);
    const versionReference = versionRef(uid, documentId, versionId);
    await db.runTransaction(async (transaction) => {
      const [documentSnapshot, versionSnapshot, stateSnapshot] = await Promise.all([
        transaction.get(documentReference),
        transaction.get(versionReference),
        transaction.get(accountStateRef(uid)),
      ]);
      requireAccountActiveSnapshot(stateSnapshot);
      if (
        !documentSnapshot.exists
        || documentSnapshot.data().ownerId !== uid
        || !versionSnapshot.exists
        || versionSnapshot.data().ownerId !== uid
      ) {
        throw new PrivateCloudSecurityError("version_not_found", "The requested document version is unavailable.", 404);
      }
      requireDocumentState(documentSnapshot.data(), ["active"]);
      if (
        versionSnapshot.data().state !== "active"
        || String(versionSnapshot.data().generation || "") !== verified.inspection.generation
        || versionSnapshot.data().sha256 !== verified.inspection.sha256
        || Number(versionSnapshot.data().size) !== verified.inspection.size
      ) {
        throw new PrivateCloudSecurityError("version_changed", "The document version changed during restore.", 409);
      }
      transaction.update(documentReference, {
        currentVersionId: versionId,
        currentSize: verified.inspection.size,
        currentSha256: verified.inspection.sha256,
        pageCount: Number(versionSnapshot.data().pageCount || 0),
        updatedAt: nowTimestamp(clock),
      });
    });
    return {
      documentId,
      versionId,
      state: "active",
      restoreConfirmed: true,
    };
  }

  async function closeAndDeleteDocumentUploadIntents(uid, documentId) {
    const query = db.collection(COLLECTIONS.uploadIntents)
      .where("ownerId", "==", uid)
      .where("documentId", "==", documentId);
    await closeTrackedUploadIntents(uid, query);
    const deleted = await deleteQueryInBatches(query);
    const remaining = await query.limit(1).get();
    if (!remaining.empty) {
      throw new PrivateCloudSecurityError(
        "upload_intent_delete_unconfirmed",
        "Pending upload deletion could not be confirmed.",
        503,
      );
    }
    return deleted;
  }

  async function purgeDocument(uid, documentId, { skipRateLimit = false } = {}) {
    if (!skipRateLimit) await enforceRateLimit(uid, "mutate_document");
    requireInternalId(documentId, "doc");
    const reference = documentRef(uid, documentId);
    const prefix = `users/${encodeVerifiedUserId(uid)}/documents/${documentId}/`;
    const proposedPurgeOperationId = createOperationId();
    const claim = await db.runTransaction(async (transaction) => {
      const [snapshot, stateSnapshot] = await Promise.all([
        transaction.get(reference),
        transaction.get(accountStateRef(uid)),
      ]);
      requireAccountActiveSnapshot(stateSnapshot);
      if (!snapshot.exists) {
        return {
          missing: true,
          purgeOperationId: proposedPurgeOperationId,
          accountingReleased: true,
        };
      }
      if (snapshot.data().ownerId !== uid) {
        throw new PrivateCloudSecurityError("document_not_found", "The requested document is unavailable.", 404);
      }
      if (![
        "active",
        "trashed",
        "failed",
        "pending",
        "purging",
        "purge_failed",
        "purge_metadata_pending",
      ].includes(snapshot.data().state)) {
        throw new PrivateCloudSecurityError(
          "document_not_available",
          "The requested document is unavailable.",
          409,
        );
      }
      const purgeOperationId = (
        ["purging", "purge_failed", "purge_metadata_pending"].includes(snapshot.data().state)
        && OPERATION_ID_PATTERN.test(String(snapshot.data().purgeOperationId || ""))
      )
        ? snapshot.data().purgeOperationId
        : proposedPurgeOperationId;
      transaction.update(reference, {
        state: snapshot.data().accountingReleased === true
          ? "purge_metadata_pending"
          : "purging",
        purgeOperationId,
        updatedAt: nowTimestamp(clock),
      });
      return {
        missing: false,
        purgeOperationId,
        accountingReleased: snapshot.data().accountingReleased === true,
      };
    });

    try {
      await revokeAndDeleteShares(uid, { sourceDocumentId: documentId });
      await closeTrackedUploadIntents(
        uid,
        db.collection(COLLECTIONS.uploadIntents)
          .where("ownerId", "==", uid)
          .where("documentId", "==", documentId),
      );
      await deleteStoragePrefix(prefix);
      await verifyStoragePrefixEmpty(prefix);
      const versionsSnapshot = await reference.collection("versions").get();
      if (claim.missing && !versionsSnapshot.empty) {
        throw new PrivateCloudSecurityError(
          "purge_accounting_state_missing",
          "Document descendants require quota reconciliation before deletion can be confirmed.",
          503,
        );
      }
      if (!claim.missing) {
        await db.runTransaction(async (transaction) => {
          const [documentSnapshot, usageSnapshot, stateSnapshot, ...freshVersions] = await Promise.all([
            transaction.get(reference),
            transaction.get(usageRef(uid)),
            transaction.get(accountStateRef(uid)),
            ...versionsSnapshot.docs.map((version) => transaction.get(version.ref)),
          ]);
          requireAccountActiveSnapshot(stateSnapshot);
          if (!documentSnapshot.exists) return;
          const document = documentSnapshot.data();
          if (
            document.ownerId !== uid
            || document.purgeOperationId !== claim.purgeOperationId
            || !["purging", "purge_failed", "purge_metadata_pending"].includes(document.state)
          ) {
            throw new PrivateCloudSecurityError(
              "document_purge_race",
              "The document purge state changed unexpectedly.",
              409,
            );
          }
          if (document.accountingReleased === true) return;
          const removedBytes = freshVersions.reduce((total, item) => (
            item.exists && item.data().state === "active"
              ? total + Number(item.data().size || 0)
              : total
          ), 0);
          const releasedReservedBytes = freshVersions.reduce((total, item) => (
            item.exists
            && item.data().reservationCharged !== false
            && ["uploading", "validating", "cleanup_pending"].includes(item.data().state)
              ? total + Number(item.data().declaredSize || 0)
              : total
          ), 0);
          const usage = usageSnapshot.data() || {};
          const activeBytes = Number(usage.activeBytes || 0);
          const reservedBytes = Number(usage.reservedBytes || 0);
          const documentCount = Number(usage.documentCount || 0);
          if (
            !Number.isSafeInteger(removedBytes)
            || !Number.isSafeInteger(releasedReservedBytes)
            || !Number.isSafeInteger(activeBytes)
            || !Number.isSafeInteger(reservedBytes)
            || !Number.isSafeInteger(documentCount)
            || activeBytes < removedBytes
            || reservedBytes < releasedReservedBytes
            || documentCount < 1
          ) {
            throw new PrivateCloudSecurityError(
              "quota_accounting_mismatch",
              "Private cloud quota accounting requires reconciliation.",
              503,
            );
          }
          transaction.set(usageRef(uid), {
            ownerId: uid,
            activeBytes: activeBytes - removedBytes,
            reservedBytes: reservedBytes - releasedReservedBytes,
            documentCount: documentCount - 1,
            updatedAt: nowTimestamp(clock),
          }, { merge: true });
          transaction.update(reference, {
            state: "purge_metadata_pending",
            accountingReleased: true,
            accountingReleasedAt: nowTimestamp(clock),
            updatedAt: nowTimestamp(clock),
          });
        });
      }

      await closeAndDeleteDocumentUploadIntents(uid, documentId);
      await db.recursiveDelete(reference);
      await verifyStoragePrefixEmpty(prefix);
      const [documentSnapshot, remainingVersions, remainingIntents, remainingShares] = await Promise.all([
        reference.get(),
        reference.collection("versions").limit(1).get(),
        db.collection(COLLECTIONS.uploadIntents)
          .where("ownerId", "==", uid)
          .where("documentId", "==", documentId)
          .limit(1)
          .get(),
        db.collection("shareLinks")
          .where("ownerId", "==", uid)
          .where("sourceDocumentId", "==", documentId)
          .limit(1)
          .get(),
      ]);
      if (
        documentSnapshot.exists
        || !remainingVersions.empty
        || !remainingIntents.empty
        || !remainingShares.empty
      ) {
        throw new PrivateCloudSecurityError(
          "metadata_delete_unconfirmed",
          "Private document deletion could not be confirmed.",
          503,
        );
      }
    } catch (error) {
      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        if (
          !snapshot.exists
          || snapshot.data().ownerId !== uid
          || snapshot.data().purgeOperationId !== claim.purgeOperationId
        ) {
          return;
        }
        transaction.update(reference, {
          state: snapshot.data().accountingReleased === true
            ? "purge_metadata_pending"
            : "purge_failed",
          updatedAt: nowTimestamp(clock),
        });
      }).catch(() => {});
      throw error;
    }
    return {
      documentId,
      state: "deleted",
      deleteConfirmed: true,
      purgeConfirmed: true,
    };
  }

  async function purgeAccountData(uid, authTimeIsRecent) {
    await enforceRateLimit(uid, "purge_account");
    if (!authTimeIsRecent) {
      throw new PrivateCloudSecurityError(
        "recent_authentication_required",
        "Sign in again before deleting the account.",
        401,
      );
    }

    const proposedPurgeOperationId = createOperationId();
    const claim = await db.runTransaction(async (transaction) => {
      const stateReference = accountStateRef(uid);
      const snapshot = await transaction.get(stateReference);
      if (snapshot.exists && snapshot.data()?.state === "deleted") {
        return {
          alreadyDeleted: true,
          purgeOperationId: snapshot.data().purgeOperationId || proposedPurgeOperationId,
        };
      }
      const purgeOperationId = (
        snapshot.exists
        && snapshot.data()?.state === "purging"
        && OPERATION_ID_PATTERN.test(String(snapshot.data()?.purgeOperationId || ""))
      )
        ? snapshot.data().purgeOperationId
        : proposedPurgeOperationId;
      transaction.set(stateReference, {
        state: "purging",
        purgeOperationId,
        startedAt: snapshot.data()?.startedAt || nowTimestamp(clock),
        updatedAt: nowTimestamp(clock),
      });
      return { alreadyDeleted: false, purgeOperationId };
    });

    await closeTrackedUploadIntents(
      uid,
      db.collection(COLLECTIONS.uploadIntents).where("ownerId", "==", uid),
    );
    await revokeAndDeleteShares(uid);
    const privatePrefix = `users/${encodeVerifiedUserId(uid)}/`;
    await deleteStoragePrefix(privatePrefix);
    await verifyStoragePrefixEmpty(privatePrefix);

    await db.recursiveDelete(userRef(uid));
    await Promise.all([
      deleteQueryInBatches(db.collection("productAnalyticsEvents").where("actorId", "==", uid)),
      deleteQueryInBatches(db.collection("supportRequests").where("actorId", "==", uid)),
      deleteQueryInBatches(db.collection("signingRequests").where("ownerId", "==", uid)),
      deleteQueryInBatches(db.collection(COLLECTIONS.uploadIntents).where("ownerId", "==", uid)),
      deleteQueryInBatches(
        db.collection(COLLECTIONS.rateLimits)
          .where("actorHash", "==", createHash("sha256").update(uid).digest("hex")),
      ),
    ]);
    await db.collection("authUserProfiles").doc(uid).delete();
    await usageRef(uid).delete();
    await db.collection(COLLECTIONS.accountPurgeJobs).doc(uid).delete();

    const [
      remainingUser,
      remainingLegacyDocuments,
      remainingPrivateDocuments,
      remainingVersions,
      remainingSettings,
      remainingLegacyUploads,
      remainingLegacyShares,
      remainingShares,
      remainingSigningRequests,
      remainingIntents,
      remainingAnalytics,
      remainingSupport,
      remainingProfile,
      remainingUsage,
      remainingPurgeJob,
      remainingRateLimit,
    ] = await Promise.all([
      userRef(uid).get(),
      userRef(uid).collection("documents").limit(1).get(),
      db.collectionGroup("privateDocuments").where("ownerId", "==", uid).limit(1).get(),
      db.collectionGroup("versions").where("ownerId", "==", uid).limit(1).get(),
      userRef(uid).collection("privateCloudSettings").limit(1).get(),
      userRef(uid).collection("privateCloudUploads").limit(1).get(),
      userRef(uid).collection("privateCloudShares").limit(1).get(),
      db.collection("shareLinks").where("ownerId", "==", uid).limit(1).get(),
      db.collection("signingRequests").where("ownerId", "==", uid).limit(1).get(),
      db.collection(COLLECTIONS.uploadIntents).where("ownerId", "==", uid).limit(1).get(),
      db.collection("productAnalyticsEvents").where("actorId", "==", uid).limit(1).get(),
      db.collection("supportRequests").where("actorId", "==", uid).limit(1).get(),
      db.collection("authUserProfiles").doc(uid).get(),
      usageRef(uid).get(),
      db.collection(COLLECTIONS.accountPurgeJobs).doc(uid).get(),
      db.collection(COLLECTIONS.rateLimits)
        .where("actorHash", "==", createHash("sha256").update(uid).digest("hex"))
        .limit(1)
        .get(),
    ]);
    await verifyStoragePrefixEmpty(privatePrefix);
    if (
      remainingUser.exists
      || !remainingLegacyDocuments.empty
      || !remainingPrivateDocuments.empty
      || !remainingVersions.empty
      || !remainingSettings.empty
      || !remainingLegacyUploads.empty
      || !remainingLegacyShares.empty
      || !remainingShares.empty
      || !remainingSigningRequests.empty
      || !remainingIntents.empty
      || !remainingAnalytics.empty
      || !remainingSupport.empty
      || remainingProfile.exists
      || remainingUsage.exists
      || remainingPurgeJob.exists
      || !remainingRateLimit.empty
    ) {
      throw new PrivateCloudSecurityError(
        "account_purge_unconfirmed",
        "Account data deletion could not be confirmed.",
        503,
      );
    }
    await db.runTransaction(async (transaction) => {
      const reference = accountStateRef(uid);
      const snapshot = await transaction.get(reference);
      if (
        !snapshot.exists
        || snapshot.data()?.purgeOperationId !== claim.purgeOperationId
        || !["purging", "deleted"].includes(snapshot.data()?.state)
      ) {
        throw new PrivateCloudSecurityError(
          "account_purge_state_changed",
          "Account data deletion could not be confirmed.",
          503,
        );
      }
      transaction.set(reference, {
        state: "deleted",
        purgeOperationId: claim.purgeOperationId,
        completedAt: snapshot.data()?.completedAt || nowTimestamp(clock),
        updatedAt: nowTimestamp(clock),
      });
    });
    return { state: "complete", purgeConfirmed: true };
  }

  async function purgeExpiredTrash(limit = 25) {
    const snapshot = await db.collectionGroup("privateDocuments")
      .where("state", "==", "trashed")
      .where("retentionUntil", "<=", nowTimestamp(clock))
      .orderBy("retentionUntil", "asc")
      .limit(Math.max(1, Math.min(100, Number(limit) || 25)))
      .get();
    let completed = 0;
    for (const item of snapshot.docs) {
      const path = item.ref.path.split("/");
      const uid = path[1];
      try {
        await purgeDocument(uid, item.id, { skipRateLimit: true });
        completed += 1;
      } catch {
        // The document stays unavailable and is retried by the next run.
      }
    }
    return { processed: snapshot.size, completed };
  }

  async function purgeExpiredShares(limit = 100) {
    const boundedLimit = Math.max(1, Math.min(250, Number(limit) || 100));
    const [revokedSnapshot, expiredSnapshot] = await Promise.all([
      db.collection("shareLinks")
        .where("status", "==", "revoked")
        .limit(boundedLimit)
        .get(),
      db.collection("shareLinks")
        .where("expiresAt", "<=", nowTimestamp(clock))
        .limit(boundedLimit)
        .get(),
    ]);
    const shares = new Map(
      [...revokedSnapshot.docs, ...expiredSnapshot.docs].map((item) => [item.ref.path, item]),
    );
    let completed = 0;
    for (const share of shares.values()) {
      try {
        await db.runTransaction(async (transaction) => {
          const fresh = await transaction.get(share.ref);
          if (!fresh.exists) return;
          transaction.update(share.ref, {
            status: "revoked",
            revokedAt: fresh.data().revokedAt || nowTimestamp(clock),
            updatedAt: nowTimestamp(clock),
          });
          transaction.delete(db.collection("signingRequests").doc(share.id));
        });
        if (SHARE_ID_PATTERN.test(share.id)) {
          await deleteStoragePrefix(`shares/${share.id}/`);
          await verifyStoragePrefixEmpty(`shares/${share.id}/`);
        }
        await db.recursiveDelete(share.ref);
        await db.collection("signingRequests").doc(share.id).delete();
        completed += 1;
      } catch {
        // A later retention run retries without reactivating the share.
      }
    }
    return { processed: shares.size, completed };
  }

  async function markCurrentVersionUnavailable(uid, documentId, versionId, versionState) {
    await db.runTransaction(async (transaction) => {
      const parent = documentRef(uid, documentId);
      const version = versionRef(uid, documentId, versionId);
      const [parentSnapshot, versionSnapshot, stateSnapshot] = await Promise.all([
        transaction.get(parent),
        transaction.get(version),
        transaction.get(accountStateRef(uid)),
      ]);
      if (
        (stateSnapshot.exists && stateSnapshot.data()?.state !== "active")
        || !parentSnapshot.exists
        || parentSnapshot.data().ownerId !== uid
        || parentSnapshot.data().currentVersionId !== versionId
        || !versionSnapshot.exists
        || versionSnapshot.data().ownerId !== uid
        || versionSnapshot.data().state !== versionState
      ) {
        return;
      }
      transaction.update(parent, {
        state: "unavailable",
        updatedAt: nowTimestamp(clock),
      });
    });
  }

  async function reconcile(limit = 40) {
    const now = clock();
    let failedUploads = 0;
    let missingObjects = 0;
    let checksumMismatches = 0;
    let orphanObjects = 0;
    let orphanShareObjects = 0;
    let purgeRetries = 0;
    let quotaMismatches = 0;

    const pendingSnapshot = await db.collectionGroup("versions")
      .where("state", "in", ["uploading", "validating", "cleanup_pending"])
      .where("expiresAt", "<=", Timestamp.fromDate(now))
      .limit(limit)
      .get();
    for (const item of pendingSnapshot.docs) {
      const path = item.ref.path.split("/");
      const uid = path[1];
      const documentId = path[3];
      try {
        await releaseUploadReservation(uid, {
          ...item.data(),
          documentId,
          versionId: item.id,
          uploadId: item.data().idempotencyKeyHash,
        });
        failedUploads += 1;
      } catch {
        // cleanup_pending remains visible to the next reconciliation pass.
      }
    }

    const stateRef = db.collection(COLLECTIONS.reconciliation).doc("cursor");
    const cursorSnapshot = await stateRef.get();
    const cursor = String(cursorSnapshot.data()?.activeVersionPath || "");
    let activeQuery = db.collectionGroup("versions")
      .where("state", "==", "active")
      .orderBy(FieldPath.documentId())
      .limit(Math.min(limit, 10));
    if (/^users\/[^/]+\/privateDocuments\/doc_[A-Za-z0-9_-]{24}\/versions\/ver_[A-Za-z0-9_-]{24}$/.test(cursor)) {
      activeQuery = activeQuery.startAfter(cursor);
    }
    let activeSnapshot = await activeQuery.get();
    if (activeSnapshot.empty && cursor) {
      activeSnapshot = await db.collectionGroup("versions")
        .where("state", "==", "active")
        .orderBy(FieldPath.documentId())
        .limit(Math.min(limit, 10))
        .get();
    }
    for (const item of activeSnapshot.docs) {
      const value = item.data();
      const path = item.ref.path.split("/");
      const uid = path[1];
      const documentId = path[3];
      const expectedKey = privateVersionStorageKey(uid, documentId, item.id);
      try {
        if (value.storageKey !== expectedKey) {
          throw new PrivateCloudSecurityError("storage_key_mismatch", "A stored document path failed validation.", 500);
        }
        const inspection = await downloadAndFastInspectPrivatePdf(
          bucket.file(expectedKey, { generation: Number(value.generation) }),
          {
            expectedSize: Number(value.size),
            expectedGeneration: String(value.generation || ""),
            maximumFileBytes: config.maximumFileBytes,
          },
        );
        if (value.sha256 !== inspection.sha256) {
          await item.ref.update({ state: "checksum_mismatch", updatedAt: nowTimestamp(clock) });
          if (value.documentId && value.documentId === documentId) {
            await markCurrentVersionUnavailable(uid, documentId, item.id, "checksum_mismatch");
          }
          checksumMismatches += 1;
        }
      } catch {
        await item.ref.update({ state: "missing", updatedAt: nowTimestamp(clock) }).catch(() => {});
        await markCurrentVersionUnavailable(uid, documentId, item.id, "missing").catch(() => {});
        missingObjects += 1;
      }
    }
    await stateRef.set({
      activeVersionPath: activeSnapshot.docs.at(-1)?.ref.path || "",
      updatedAt: nowTimestamp(clock),
    }, { merge: true });

    const failedPurges = await db.collectionGroup("privateDocuments")
      .where("state", "in", ["purge_failed", "purging"])
      .limit(Math.min(limit, 10))
      .get();
    for (const item of failedPurges.docs) {
      const path = item.ref.path.split("/");
      try {
        await purgeDocument(path[1], item.id, { skipRateLimit: true });
        purgeRetries += 1;
      } catch {
        // A later run retries without exposing the record to users.
      }
    }

    const orphanStartOffset = String(cursorSnapshot.data()?.orphanStartOffset || "");
    let [files] = await bucket.getFiles({
      prefix: "users/",
      ...(orphanStartOffset ? { startOffset: orphanStartOffset } : {}),
      versions: true,
      autoPaginate: false,
      maxResults: 200,
    });
    if (!files.length && orphanStartOffset) {
      [files] = await bucket.getFiles({
        prefix: "users/",
        versions: true,
        autoPaginate: false,
        maxResults: 200,
      });
    }
    for (const file of files) {
      if (!/\/documents\/doc_[A-Za-z0-9_-]{24}\/versions\/ver_[A-Za-z0-9_-]{24}\.pdf$/.test(file.name)) continue;
      const [metadata] = await file.getMetadata();
      if (now.getTime() - new Date(metadata.timeCreated || 0).getTime() < 24 * 60 * 60 * 1_000) continue;
      const reference = await db.collectionGroup("versions")
        .where("storageKey", "==", file.name)
        .limit(1)
        .get();
      if (reference.empty) {
        await file.delete({ ignoreNotFound: true });
        orphanObjects += 1;
      }
    }
    await stateRef.set({
      orphanStartOffset: files.at(-1)?.name ? `${files.at(-1).name}\u0000` : "",
      updatedAt: nowTimestamp(clock),
    }, { merge: true });

    const shareStartOffset = String(cursorSnapshot.data()?.shareStartOffset || "");
    let [shareFiles] = await bucket.getFiles({
      prefix: "shares/",
      ...(shareStartOffset ? { startOffset: shareStartOffset } : {}),
      versions: true,
      autoPaginate: false,
      maxResults: 200,
    });
    if (!shareFiles.length && shareStartOffset) {
      [shareFiles] = await bucket.getFiles({
        prefix: "shares/",
        versions: true,
        autoPaginate: false,
        maxResults: 200,
      });
    }
    for (const file of shareFiles) {
      const match = file.name.match(/^shares\/([a-f0-9]{64}|[A-Za-z0-9_-]{32})\/document\.pdf$/);
      if (!match) continue;
      const [metadata] = await file.getMetadata();
      if (now.getTime() - new Date(metadata.timeCreated || 0).getTime() < 24 * 60 * 60 * 1_000) continue;
      const share = await db.collection("shareLinks").doc(match[1]).get();
      if (!share.exists) {
        await file.delete({ ignoreNotFound: true });
        orphanShareObjects += 1;
      }
    }
    await stateRef.set({
      shareStartOffset: shareFiles.at(-1)?.name ? `${shareFiles.at(-1).name}\u0000` : "",
      updatedAt: nowTimestamp(clock),
    }, { merge: true });

    const usageSnapshot = await db.collection(COLLECTIONS.usage)
      .limit(Math.min(limit, 20))
      .get();
    for (const usageItem of usageSnapshot.docs) {
      const ownerId = String(usageItem.data().ownerId || "");
      try {
        encodeVerifiedUserId(ownerId);
        const stateSnapshot = await accountStateRef(ownerId).get();
        if (stateSnapshot.exists && stateSnapshot.data()?.state !== "active") continue;
        const documentSnapshot = await documentsCollection(ownerId).get();
        let expectedActiveBytes = 0;
        let expectedReservedBytes = 0;
        let expectedDocumentCount = 0;
        for (const document of documentSnapshot.docs) {
          if (
            document.data().ownerId !== ownerId
            || ["purging", "purge_failed", "purge_metadata_pending"].includes(document.data().state)
          ) {
            continue;
          }
          expectedDocumentCount += 1;
          const versions = await document.ref.collection("versions").get();
          for (const version of versions.docs) {
            if (version.data().ownerId !== ownerId) continue;
            if (version.data().state === "active") {
              expectedActiveBytes += Number(version.data().size || 0);
            } else if (
              version.data().reservationCharged !== false
              && ["uploading", "validating", "cleanup_pending"].includes(version.data().state)
            ) {
              expectedReservedBytes += Number(version.data().declaredSize || 0);
            }
          }
        }
        if (
          Number(usageItem.data().activeBytes || 0) !== expectedActiveBytes
          || Number(usageItem.data().reservedBytes || 0) !== expectedReservedBytes
          || Number(usageItem.data().documentCount || 0) !== expectedDocumentCount
        ) {
          quotaMismatches += 1;
        }
      } catch {
        quotaMismatches += 1;
      }
    }

    const result = {
      failedUploads,
      missingObjects,
      checksumMismatches,
      orphanObjects,
      orphanShareObjects,
      purgeRetries,
      quotaMismatches,
    };
    await db.collection(COLLECTIONS.reconciliation).doc("latest").set({
      ...result,
      completedAt: nowTimestamp(clock),
    });
    return result;
  }

  async function purgeExpiredOperationalRecords(limit = 250) {
    const now = nowTimestamp(clock);
    let deleted = 0;
    const expiredIntents = await db.collection(COLLECTIONS.uploadIntents)
      .where("expiresAt", "<=", now)
      .limit(limit)
      .get();
    const safeIntentDeletes = expiredIntents.docs.filter((item) => (
      !item.data().uploadSessionUrl
      && item.data().reservationCharged === false
      && ["failed", "active"].includes(item.data().state)
    ));
    if (safeIntentDeletes.length) {
      const batch = db.batch();
      safeIntentDeletes.forEach((item) => batch.delete(item.ref));
      await batch.commit();
      deleted += safeIntentDeletes.length;
    }
    const expiredRateLimits = await db.collection(COLLECTIONS.rateLimits)
      .where("expiresAt", "<=", now)
      .limit(limit)
      .get();
    if (!expiredRateLimits.empty) {
      const batch = db.batch();
      expiredRateLimits.docs.forEach((item) => batch.delete(item.ref));
      await batch.commit();
      deleted += expiredRateLimits.size;
    }
    return { deleted };
  }

  return Object.freeze({
    getCloudHistory,
    setCloudHistory,
    beginUpload,
    finalizeUpload,
    listDocuments,
    listVersions,
    prepareDownload,
    trashDocument,
    restoreDocument,
    restoreVersion,
    purgeDocument,
    purgeAccountData,
    purgeExpiredTrash,
    purgeExpiredShares,
    reconcile,
    purgeExpiredOperationalRecords,
  });
}

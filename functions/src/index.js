import { defineString } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { loadPrivateCloudConfig } from "./config.js";
import { firebaseAdminServices } from "./adapters/firebaseAdmin.js";
import {
  applyCors,
  configureApiResponse,
  privacySafeActorId,
  readSmallJsonBody,
  requestContext,
  safeLog,
  sendSafeError,
  verifyFirebaseRequest,
} from "./security/httpSecurity.js";
import { isRecentAuthentication, PrivateCloudSecurityError } from "./security/privateCloudDocumentService.js";
import { createPrivateMalwareScanner } from "./security/productionPdfInspection.js";
import { createPrivateCloudDocumentService } from "./services/privateCloudDocuments.js";
import { loadAnalyticsConfig } from "./analyticsConfig.js";
import { createAnalyticsApiHandler } from "./analyticsApi.js";
import { createProductAnalyticsService } from "./services/productAnalytics.js";

const runtimeServiceAccount = defineString("PRIVATE_CLOUD_SERVICE_ACCOUNT_EMAIL");
let backend;
let productAnalyticsBackend;

function privateCloudBackend() {
  if (backend) return backend;
  const config = loadPrivateCloudConfig();
  const admin = firebaseAdminServices(config.bucketName);
  const scanner = createPrivateMalwareScanner({
    endpoint: config.malwareScannerUrl,
    required: config.requireMalwareScan,
  });
  backend = Object.freeze({
    admin,
    config,
    documents: createPrivateCloudDocumentService({
      db: admin.db,
      bucket: admin.bucket,
      scanner,
      config,
    }),
  });
  return backend;
}

function analyticsBackend() {
  if (productAnalyticsBackend) return productAnalyticsBackend;
  const config = loadAnalyticsConfig();
  const admin = firebaseAdminServices();
  productAnalyticsBackend = Object.freeze({
    admin,
    config,
    analytics: createProductAnalyticsService({ db: admin.db, retentionDays: config.retentionDays }),
  });
  return productAnalyticsBackend;
}

function routePath(request) {
  return new URL(request.originalUrl || request.url || "/", "https://private.invalid")
    .pathname
    .replace(/\/+$/, "") || "/";
}

function assertMethod(request, expected) {
  if (request.method !== expected) {
    throw new PrivateCloudSecurityError("method_not_allowed", "This HTTP method is not allowed.", 405);
  }
}

function idempotencyKey(request) {
  return String(request.get("idempotency-key") || "");
}

async function streamPrivatePdf(response, download) {
  const [metadata] = await download.file.getMetadata();
  const expectedGeneration = String(download.version.generation || "");
  if (
    !expectedGeneration
    || String(metadata.generation || "") !== expectedGeneration
    || Number(metadata.size) !== Number(download.version.size)
    || String(metadata.contentType || "").toLowerCase() !== "application/pdf"
  ) {
    throw new PrivateCloudSecurityError(
      "document_generation_mismatch",
      "The private document generation failed verification.",
      409,
    );
  }
  response.status(200);
  response.set({
    "Content-Type": "application/pdf",
    "Content-Length": String(download.version.size),
    "Content-Disposition": download.contentDisposition,
  });
  await new Promise((resolve, reject) => {
    const stream = download.file.createReadStream({ validation: "crc32c" });
    stream.once("error", reject);
    response.once("close", resolve);
    response.once("finish", resolve);
    stream.pipe(response);
  });
}

export function createPrivateCloudApiHandler({ backendProvider = privateCloudBackend } = {}) {
  return async function apiHandler(request, response) {
    const context = requestContext(request);
    configureApiResponse(response);
    try {
      const cloud = backendProvider();
      const origin = applyCors(request, response, cloud.config.allowedOrigins);
      if (request.method === "OPTIONS") {
        response.status(204).end();
        return;
      }
      const identity = await verifyFirebaseRequest(
        request,
        cloud.admin,
        cloud.config.allowedAppIds,
      );
      const logContext = {
        ...context,
        actor: privacySafeActorId(identity.uid),
      };
      const path = routePath(request);

      if (path === "/v1/cloud-history") {
        if (request.method === "GET") {
          const result = await cloud.documents.getCloudHistory(identity.uid);
          response.status(200).json({ ok: true, ...result });
          return;
        }
        assertMethod(request, "PUT");
        const body = readSmallJsonBody(request);
        if (Object.keys(body).length !== 1 || typeof body.enabled !== "boolean") {
          throw new PrivateCloudSecurityError(
            "invalid_request_body",
            "A boolean cloud-history setting is required.",
          );
        }
        const result = await cloud.documents.setCloudHistory(identity.uid, body.enabled);
        response.status(200).json({ ok: true, ...result });
        return;
      }

      if (path === "/v1/documents/uploads") {
        assertMethod(request, "POST");
        const body = {
          ...readSmallJsonBody(request),
          idempotencyKey: idempotencyKey(request),
        };
        const result = await cloud.documents.beginUpload(identity.uid, body, origin);
        safeLog("info", "Private upload session prepared", {
          ...logContext,
          operation: "begin_upload",
          outcome: result.state,
        });
        response.status(result.reused ? 200 : 201).json({ ok: true, ...result });
        return;
      }

      const finalizeMatch = path.match(/^\/v1\/documents\/uploads\/([a-f0-9]{64})\/finalize$/);
      if (finalizeMatch) {
        assertMethod(request, "POST");
        const body = readSmallJsonBody(request);
        if (Object.keys(body).some((key) => key !== "checksumSha256")) {
          throw new PrivateCloudSecurityError("invalid_request_body", "Only the upload checksum is accepted.");
        }
        const result = await cloud.documents.finalizeUpload(identity.uid, finalizeMatch[1], {
          checksumSha256: body.checksumSha256,
          idempotencyKey: idempotencyKey(request),
        });
        safeLog("info", "Private upload finalized", {
          ...logContext,
          operation: "finalize_upload",
          outcome: result.reused ? "reused" : "active",
        });
        response.status(200).json({ ok: true, ...result });
        return;
      }

      if (path === "/v1/documents") {
        assertMethod(request, "GET");
        const result = await cloud.documents.listDocuments(identity.uid, {
          limit: request.query.limit,
          cursor: request.query.cursor,
          includeDeleted: request.query.includeDeleted === "true",
        });
        response.status(200).json({ ok: true, ...result });
        return;
      }

      const versionsMatch = path.match(/^\/v1\/documents\/(doc_[A-Za-z0-9_-]{24})\/versions$/);
      if (versionsMatch) {
        assertMethod(request, "GET");
        const result = await cloud.documents.listVersions(identity.uid, versionsMatch[1], {
          limit: request.query.limit,
        });
        response.status(200).json({ ok: true, ...result });
        return;
      }

      const downloadMatch = path.match(/^\/v1\/documents\/(doc_[A-Za-z0-9_-]{24})\/download$/);
      if (downloadMatch) {
        assertMethod(request, "GET");
        const download = await cloud.documents.prepareDownload(
          identity.uid,
          downloadMatch[1],
          String(request.query.versionId || ""),
        );
        safeLog("info", "Private document download authorized", {
          ...logContext,
          operation: "download_document",
          outcome: "authorized",
        });
        await streamPrivatePdf(response, download);
        return;
      }

      const restoreVersionMatch = path.match(
        /^\/v1\/documents\/(doc_[A-Za-z0-9_-]{24})\/versions\/(ver_[A-Za-z0-9_-]{24})\/restore$/,
      );
      if (restoreVersionMatch) {
        assertMethod(request, "POST");
        const result = await cloud.documents.restoreVersion(
          identity.uid,
          restoreVersionMatch[1],
          restoreVersionMatch[2],
        );
        response.status(200).json({ ok: true, ...result });
        return;
      }

      const restoreMatch = path.match(/^\/v1\/documents\/(doc_[A-Za-z0-9_-]{24})\/restore$/);
      if (restoreMatch) {
        assertMethod(request, "POST");
        const result = await cloud.documents.restoreDocument(identity.uid, restoreMatch[1]);
        response.status(200).json({ ok: true, ...result });
        return;
      }

      const documentMatch = path.match(/^\/v1\/documents\/(doc_[A-Za-z0-9_-]{24})$/);
      if (documentMatch) {
        assertMethod(request, "DELETE");
        const permanent = request.query.permanent === "true";
        const result = permanent
          ? await cloud.documents.purgeDocument(identity.uid, documentMatch[1])
          : await cloud.documents.trashDocument(identity.uid, documentMatch[1]);
        safeLog("info", "Private document deletion completed", {
          ...logContext,
          operation: permanent ? "purge_document" : "trash_document",
          outcome: result.state,
        });
        response.status(200).json({ ok: true, ...result });
        return;
      }

      if (path === "/v1/account/data") {
        assertMethod(request, "DELETE");
        const result = await cloud.documents.purgeAccountData(
          identity.uid,
          isRecentAuthentication(identity.authTime),
        );
        safeLog("warn", "Private account data purge completed", {
          ...logContext,
          operation: "purge_account",
          outcome: result.state,
        });
        response.status(200).json({ ok: true, ...result });
        return;
      }

      throw new PrivateCloudSecurityError("route_not_found", "The private cloud route was not found.", 404);
    } catch (error) {
      if (response.headersSent) {
        response.destroy(error);
        return;
      }
      sendSafeError(response, error, context);
    }
  };
}

const apiHandler = createPrivateCloudApiHandler();
const productAnalyticsApiHandler = createAnalyticsApiHandler({ backendProvider: analyticsBackend });

const privateCloudFunctionOptions = {
  timeoutSeconds: 540,
  memory: "2GiB",
  maxInstances: 10,
  concurrency: 1,
  invoker: "public",
  serviceAccount: runtimeServiceAccount,
};

const privateCloudScheduleOptions = {
  timeZone: "Etc/UTC",
  timeoutSeconds: 540,
  memory: "2GiB",
  maxInstances: 1,
  concurrency: 1,
  serviceAccount: runtimeServiceAccount,
};

export const privateCloudDocumentsApi = onRequest(
  privateCloudFunctionOptions,
  apiHandler,
);

export const analyticsApi = onRequest({
  timeoutSeconds: 60,
  memory: "512MiB",
  maxInstances: 20,
  concurrency: 40,
  invoker: "public",
}, productAnalyticsApiHandler);

export const reconcilePrivateCloudDocuments = onSchedule({
  ...privateCloudScheduleOptions,
  schedule: "every 6 hours",
}, async () => {
  const context = { requestId: "scheduled", operation: "reconcile_private_cloud" };
  try {
    const result = await privateCloudBackend().documents.reconcile();
    safeLog("info", "Private cloud reconciliation completed", {
      ...context,
      outcome: "complete",
      count: Object.values(result).reduce((total, value) => total + Number(value || 0), 0),
    });
  } catch (error) {
    safeLog("error", "Private cloud reconciliation failed", {
      ...context,
      outcome: "failed",
      errorCode: error instanceof PrivateCloudSecurityError ? error.code : "internal_error",
    });
    throw error;
  }
});

export const purgePrivateCloudRetention = onSchedule({
  ...privateCloudScheduleOptions,
  schedule: "every 24 hours",
}, async () => {
  const context = { requestId: "scheduled", operation: "purge_private_cloud" };
  try {
    const documents = privateCloudBackend().documents;
    const [trash, shares, operational] = await Promise.all([
      documents.purgeExpiredTrash(),
      documents.purgeExpiredShares(),
      documents.purgeExpiredOperationalRecords(),
    ]);
    safeLog("info", "Private cloud retention purge completed", {
      ...context,
      outcome: "complete",
      count: Number(trash.completed || 0)
        + Number(shares.completed || 0)
        + Number(operational.deleted || 0),
    });
  } catch (error) {
    safeLog("error", "Private cloud retention purge failed", {
      ...context,
      outcome: "failed",
      errorCode: error instanceof PrivateCloudSecurityError ? error.code : "internal_error",
    });
    throw error;
  }
});

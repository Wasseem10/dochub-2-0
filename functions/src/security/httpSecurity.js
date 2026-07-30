import { createHash, randomUUID } from "node:crypto";
import { logger } from "firebase-functions";
import { PrivateCloudSecurityError } from "./privateCloudDocumentService.js";

const MAX_JSON_BODY_BYTES = 16 * 1024;

export function requestContext(request) {
  return Object.freeze({
    requestId: randomUUID(),
    method: String(request.method || "").toUpperCase(),
  });
}

export function privacySafeActorId(uid) {
  return createHash("sha256").update(String(uid || "")).digest("hex").slice(0, 16);
}

export function safeLog(level, message, context = {}) {
  const allowed = Object.fromEntries(
    Object.entries(context).filter(([key, value]) => (
      ["requestId", "operation", "outcome", "errorCode", "actor", "count", "durationBucket"].includes(key)
      && ["string", "number", "boolean"].includes(typeof value)
    )),
  );
  logger[level](message, allowed);
}

export function configureApiResponse(response) {
  response.set({
    "Cache-Control": "no-store, max-age=0",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  });
}

export function applyCors(request, response, allowedOrigins) {
  const origin = String(request.get("origin") || "");
  if (origin && !allowedOrigins.has(origin)) {
    throw new PrivateCloudSecurityError("origin_not_allowed", "This web origin is not allowed.", 403);
  }
  if (origin) {
    response.set({
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Firebase-AppCheck, X-Requested-With, Idempotency-Key",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Expose-Headers": "Content-Disposition, Content-Length, ETag",
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    });
  }
  return origin || null;
}

export async function verifyFirebaseRequest(request, { auth, appCheck }, allowedAppIds = new Set()) {
  const authorization = String(request.get("authorization") || "");
  const match = authorization.match(/^Bearer ([A-Za-z0-9._~-]+)$/);
  if (!match) throw new PrivateCloudSecurityError("authentication_required", "Sign in to continue.", 401);
  const appCheckToken = String(request.get("x-firebase-appcheck") || "");
  if (!appCheckToken) {
    throw new PrivateCloudSecurityError("app_check_required", "A valid App Check token is required.", 401);
  }
  try {
    const [decodedAuth, decodedAppCheck] = await Promise.all([
      auth.verifyIdToken(match[1], true),
      appCheck.verifyToken(appCheckToken),
    ]);
    if (
      !decodedAuth?.uid
      || !decodedAppCheck?.appId
      || (allowedAppIds.size > 0 && !allowedAppIds.has(decodedAppCheck.appId))
    ) {
      throw new Error("missing verified identity");
    }
    return Object.freeze({
      uid: decodedAuth.uid,
      authTime: decodedAuth.auth_time,
      appId: decodedAppCheck.appId,
    });
  } catch {
    throw new PrivateCloudSecurityError("invalid_authentication", "The authenticated session could not be verified.", 401);
  }
}

export function readSmallJsonBody(request) {
  const contentType = String(request.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new PrivateCloudSecurityError("invalid_request_content_type", "Use application/json for this request.", 415);
  }
  const value = request.body;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PrivateCloudSecurityError("invalid_request_body", "A JSON object is required.");
  }
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > MAX_JSON_BODY_BYTES) {
    throw new PrivateCloudSecurityError("request_body_too_large", "The request metadata is too large.", 413);
  }
  return value;
}

export function sendSafeError(response, error, context) {
  const known = error instanceof PrivateCloudSecurityError;
  const status = known ? error.status : 500;
  const code = known ? error.code : "internal_error";
  safeLog(status >= 500 ? "error" : "warn", "Private cloud request failed", {
    ...context,
    outcome: "failed",
    errorCode: code,
  });
  response.status(status).json({
    ok: false,
    error: {
      code,
      message: known ? error.message : "The private cloud operation could not be completed.",
    },
  });
}

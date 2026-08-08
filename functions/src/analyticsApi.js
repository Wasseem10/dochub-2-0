import { createHash } from "node:crypto";
import { logger } from "firebase-functions";
import { applyCors, configureApiResponse, readSmallJsonBody } from "./security/httpSecurity.js";
import { AnalyticsValidationError } from "./services/productAnalytics.js";

function bearerToken(request) {
  const match = String(request.get("authorization") || "").match(/^Bearer ([A-Za-z0-9._~-]+)$/);
  return match?.[1] || "";
}

async function optionalIdentity(request, admin) {
  const token = bearerToken(request);
  if (!token) return null;
  try {
    return await admin.auth.verifyIdToken(token, true);
  } catch {
    throw new AnalyticsValidationError("invalid_authentication", "The signed-in analytics identity is invalid.", 401);
  }
}

async function requireOwner(request, admin) {
  const token = bearerToken(request);
  if (!token) throw new AnalyticsValidationError("authentication_required", "Sign in to view analytics.", 401);
  let decoded;
  try {
    decoded = await admin.auth.verifyIdToken(token, true);
  } catch {
    throw new AnalyticsValidationError("invalid_authentication", "The analytics session is invalid.", 401);
  }
  if (decoded?.pdfenrichAdmin !== true) {
    throw new AnalyticsValidationError("analytics_forbidden", "This account cannot view private analytics.", 403);
  }
  return decoded;
}

async function verifyAppCheckIfRequired(request, admin, required) {
  const token = String(request.get("x-firebase-appcheck") || "");
  if (!token && !required) return null;
  if (!token) throw new AnalyticsValidationError("app_check_required", "A verified browser is required.", 401);
  try {
    return await admin.appCheck.verifyToken(token);
  } catch {
    throw new AnalyticsValidationError("invalid_app_check", "The browser verification token is invalid.", 401);
  }
}

export function createAnalyticsRateLimiter({ limit = 120, windowMs = 60_000, now = () => Date.now() } = {}) {
  const buckets = new Map();
  return (request) => {
    const address = String(request.ip || request.get("x-forwarded-for") || "unknown").split(",")[0].trim();
    const key = createHash("sha256").update(address).digest("hex").slice(0, 24);
    const timestamp = now();
    const current = buckets.get(key);
    if (!current || current.resetAt <= timestamp) {
      buckets.set(key, { count: 1, resetAt: timestamp + windowMs });
      return;
    }
    current.count += 1;
    if (current.count > limit) throw new AnalyticsValidationError("rate_limited", "Too many analytics events were submitted.", 429);
    if (buckets.size > 5000) {
      for (const [bucketKey, bucket] of buckets) if (bucket.resetAt <= timestamp) buckets.delete(bucketKey);
    }
  };
}

function parseDate(value, fallback) {
  if (!value) return fallback;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new AnalyticsValidationError("invalid_date_range", "The analytics date range is invalid.");
  return date.toISOString();
}

function safeAnalyticsError(response, error) {
  const known = error instanceof AnalyticsValidationError;
  const status = known ? error.status : 500;
  logger[status >= 500 ? "error" : "warn"]("Analytics request failed", {
    code: known ? error.code : "internal_error",
  });
  response.status(status).json({
    ok: false,
    error: {
      code: known ? error.code : "internal_error",
      message: known ? error.message : "The analytics request could not be completed.",
    },
  });
}

export function createAnalyticsApiHandler({ backendProvider, rateLimiter = createAnalyticsRateLimiter() } = {}) {
  return async function analyticsApiHandler(request, response) {
    configureApiResponse(response);
    try {
      const backend = backendProvider();
      applyCors(request, response, backend.config.allowedOrigins);
      if (request.method === "OPTIONS") {
        response.status(204).end();
        return;
      }
      const path = new URL(request.originalUrl || request.url || "/", "https://analytics.invalid").pathname.replace(/\/+$/, "") || "/";
      if (path === "/v1/events" && request.method === "POST") {
        rateLimiter(request);
        await verifyAppCheckIfRequired(request, backend.admin, backend.config.requireAppCheck);
        const identity = await optionalIdentity(request, backend.admin);
        const result = await backend.analytics.record(readSmallJsonBody(request), identity);
        response.status(202).json({ ok: true, ...result });
        return;
      }
      if (path === "/v1/admin/events" && request.method === "GET") {
        await verifyAppCheckIfRequired(request, backend.admin, backend.config.requireAppCheck);
        await requireOwner(request, backend.admin);
        const start = parseDate(request.query.start, null);
        const end = parseDate(request.query.end, new Date().toISOString());
        if (start && start > end) throw new AnalyticsValidationError("invalid_date_range", "The analytics start date must be before the end date.");
        const result = await backend.analytics.list({
          start,
          end,
          includeInternal: request.query.includeInternal === "true",
        });
        response.status(200).json({ ok: true, ...result });
        return;
      }
      throw new AnalyticsValidationError("route_not_found", "The analytics route was not found.", 404);
    } catch (error) {
      safeAnalyticsError(response, error);
    }
  };
}

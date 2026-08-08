import { Timestamp } from "firebase-admin/firestore";

export const ANALYTICS_EVENT_NAMES = Object.freeze([
  "page_view",
  "pdf_upload_started",
  "pdf_upload_completed",
  "pdf_upload_failed",
  "editor_opened",
  "pdf_saved",
  "pdf_downloaded",
  "signup_started",
  "signup_completed",
  "login_completed",
  "logout_completed",
  "add_text_used",
  "edit_text_used",
  "add_image_used",
  "signature_used",
  "highlight_used",
  "draw_used",
  "annotation_used",
  "page_added",
  "page_deleted",
  "page_rotated",
  "page_reordered",
  "undo_used",
  "redo_used",
  // Existing production names remain accepted while older clients roll forward.
  "homepage_viewed",
  "page_viewed",
  "tool_opened",
  "upload_started",
  "upload_validation_failed",
  "document_opened",
  "edit_made",
  "export_started",
  "export_succeeded",
  "export_failed",
  "related_tool_clicked",
  "comparison_cta_clicked",
  "optional_account_created",
  "account_signed_up",
  "account_logged_in",
  "result_downloaded",
  "task_feedback_submitted",
  "client_error",
  "unhandled_rejection",
  "slow_operation",
]);

const EVENT_NAME_SET = new Set(ANALYTICS_EVENT_NAMES);
const PROPERTY_RULES = Object.freeze({
  toolId: { type: "string", max: 80 },
  featureId: { type: "string", max: 80 },
  fileSizeBucket: { type: "string", max: 40 },
  pageCountBucket: { type: "string", max: 40 },
  errorCategory: { type: "string", max: 80 },
  result: { type: "string", max: 80 },
  authMethod: { type: "enum", values: ["email", "google", "local"] },
  operation: { type: "string", max: 80 },
  durationBucket: { type: "string", max: 40 },
  durationMs: { type: "number", min: 0, max: 1_800_000 },
  utmSource: { type: "string", max: 80 },
  utmMedium: { type: "string", max: 80 },
  utmCampaign: { type: "string", max: 120 },
});
const VISITOR_PATTERN = /^anon_[A-Za-z0-9_-]{16,80}$/;
const SESSION_PATTERN = /^session_[A-Za-z0-9_-]{16,80}$/;
const PATH_PATTERN = /^\/[A-Za-z0-9/_:-]*$/;
const SAFE_DEVICE_CATEGORIES = new Set(["desktop", "mobile", "tablet", "unknown"]);
const SAFE_BROWSER_FAMILIES = new Set(["chrome", "edge", "firefox", "safari", "other", "unknown"]);
const SAFE_TRAFFIC_SOURCES = new Set(["direct", "google", "bing", "reddit", "chatgpt", "facebook", "x", "other", "campaign"]);

export class AnalyticsValidationError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "AnalyticsValidationError";
    this.code = code;
    this.status = status;
  }
}

function cleanText(value, maximum) {
  const text = String(value || "").trim();
  const hasControlCharacter = [...text].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
  if (!text || text.length > maximum || hasControlCharacter) return "";
  return text;
}

function cleanProperties(properties) {
  if (properties == null) return {};
  if (typeof properties !== "object" || Array.isArray(properties)) {
    throw new AnalyticsValidationError("invalid_properties", "Analytics properties must be an object.");
  }
  const keys = Object.keys(properties);
  if (keys.length > 12 || keys.some((key) => !PROPERTY_RULES[key])) {
    throw new AnalyticsValidationError("unexpected_properties", "The analytics event contains unsupported properties.");
  }
  return Object.fromEntries(keys.map((key) => {
    const value = properties[key];
    const rule = PROPERTY_RULES[key];
    if (rule.type === "string") {
      const cleaned = cleanText(value, rule.max);
      if (!cleaned) throw new AnalyticsValidationError("invalid_property", `The ${key} property is invalid.`);
      return [key, cleaned];
    }
    if (rule.type === "enum") {
      if (!rule.values.includes(value)) throw new AnalyticsValidationError("invalid_property", `The ${key} property is invalid.`);
      return [key, value];
    }
    if (!Number.isFinite(value) || value < rule.min || value > rule.max) {
      throw new AnalyticsValidationError("invalid_property", `The ${key} property is invalid.`);
    }
    return [key, Math.round(value)];
  }));
}

function normalizeTrafficSource(value, referrerDomain) {
  if (SAFE_TRAFFIC_SOURCES.has(value)) return value;
  if (value === "organic" && /(^|\.)google\./.test(referrerDomain)) return "google";
  if (value === "organic" && /(^|\.)bing\./.test(referrerDomain)) return "bing";
  if (["paid", "email"].includes(value)) return "campaign";
  if (["organic", "referral", "social"].includes(value)) return "other";
  return "direct";
}

export function validateAnalyticsPayload(payload, { userId = null, now = new Date(), retentionDays = 365 } = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AnalyticsValidationError("invalid_body", "An analytics event object is required.");
  }
  const allowedKeys = new Set([
    "eventName", "visitorId", "sessionId", "path", "internalTraffic", "deviceCategory",
    "browserFamily", "trafficSource", "referrerDomain", "properties", "clientOccurredAt",
  ]);
  if (Object.keys(payload).some((key) => !allowedKeys.has(key))) {
    throw new AnalyticsValidationError("unexpected_fields", "The analytics event contains unsupported fields.");
  }
  if (!EVENT_NAME_SET.has(payload.eventName)) {
    throw new AnalyticsValidationError("invalid_event_name", "The analytics event name is not allowed.");
  }
  if (!VISITOR_PATTERN.test(String(payload.visitorId || ""))) {
    throw new AnalyticsValidationError("invalid_visitor_id", "The anonymous visitor identifier is invalid.");
  }
  if (!SESSION_PATTERN.test(String(payload.sessionId || ""))) {
    throw new AnalyticsValidationError("invalid_session_id", "The analytics session identifier is invalid.");
  }
  const path = cleanText(payload.path || "/", 160);
  if (!PATH_PATTERN.test(path)) throw new AnalyticsValidationError("invalid_path", "The analytics path is invalid.");
  const deviceCategory = SAFE_DEVICE_CATEGORIES.has(payload.deviceCategory) ? payload.deviceCategory : "unknown";
  const browserFamily = SAFE_BROWSER_FAMILIES.has(payload.browserFamily) ? payload.browserFamily : "unknown";
  const referrerDomain = cleanText(payload.referrerDomain, 120).toLowerCase();
  if (referrerDomain && !/^[a-z0-9.-]+$/.test(referrerDomain)) {
    throw new AnalyticsValidationError("invalid_referrer", "The analytics referrer is invalid.");
  }
  const trafficSource = normalizeTrafficSource(payload.trafficSource, referrerDomain);
  const clientDate = new Date(payload.clientOccurredAt || now);
  if (Number.isNaN(clientDate.getTime()) || Math.abs(now.getTime() - clientDate.getTime()) > 24 * 60 * 60 * 1000) {
    throw new AnalyticsValidationError("invalid_client_time", "The analytics timestamp is invalid.");
  }
  return Object.freeze({
    name: payload.eventName,
    visitorId: payload.visitorId,
    sessionId: payload.sessionId,
    actorId: userId || null,
    path,
    internalTraffic: payload.internalTraffic === true,
    deviceCategory,
    browserFamily,
    trafficSource,
    referrerDomain,
    properties: cleanProperties(payload.properties),
    clientOccurredAt: clientDate.toISOString(),
    expiresAt: Timestamp.fromDate(new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000)),
  });
}

export function createProductAnalyticsService({ db, retentionDays = 365 }) {
  const collection = db.collection("productAnalyticsEvents");
  return Object.freeze({
    async record(payload, identity = null) {
      const event = validateAnalyticsPayload(payload, { userId: identity?.uid || null, retentionDays });
      const document = await collection.add({
        ...event,
        occurredAt: Timestamp.now(),
      });
      return { id: document.id, eventName: event.name };
    },
    async list({ start, end, includeInternal = false, maximum = 25_000 }) {
      let query = collection.orderBy("clientOccurredAt", "desc");
      if (start) query = query.where("clientOccurredAt", ">=", start);
      if (end) query = query.where("clientOccurredAt", "<=", end);
      const snapshot = await query.limit(maximum + 1).get();
      const rows = snapshot.docs
        .slice(0, maximum)
        .map((document) => ({ id: document.id, ...document.data() }))
        .filter((event) => includeInternal || event.internalTraffic !== true)
        .map((event) => ({
          id: event.id,
          name: event.name,
          visitorId: event.visitorId,
          actorId: event.actorId || null,
          sessionId: event.sessionId || null,
          path: event.path || event.properties?.route || "/",
          internalTraffic: event.internalTraffic === true,
          deviceCategory: event.deviceCategory || event.properties?.deviceClass || "unknown",
          browserFamily: event.browserFamily || event.properties?.browserFamily || "unknown",
          trafficSource: event.trafficSource || event.properties?.trafficSource || "direct",
          referrerDomain: event.referrerDomain || event.properties?.referrerDomain || "",
          properties: event.properties || {},
          clientOccurredAt: event.clientOccurredAt,
        }));
      return { events: rows, truncated: snapshot.size > maximum, maximum };
    },
  });
}

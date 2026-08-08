import { optionalAnalyticsAllowed } from "../privacy/privacyChoices.js";
import { privacySafeRoute } from "../privacy/privacySafeRoute.js";
import { queueGoogleAnalyticsEvent } from "./googleAnalytics.js";

const ALLOWED_EVENTS = new Set([
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
  // Accepted during the transition from the earlier event vocabulary.
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

const ALLOWED_PROPERTIES = new Set([
  "toolId",
  "featureId",
  "fileSizeBucket",
  "pageCountBucket",
  "errorCategory",
  "result",
  "authMethod",
  "route",
  "operation",
  "durationBucket",
  "durationMs",
  "deviceClass",
  "browserFamily",
  "trafficSource",
  "referrerDomain",
  "landingPath",
  "utmSource",
  "utmMedium",
  "utmCampaign",
]);
const FIRESTORE_ANALYTICS_PROPERTIES = new Set([
  "toolId",
  "featureId",
  "fileSizeBucket",
  "pageCountBucket",
  "errorCategory",
  "result",
  "authMethod",
  "operation",
  "durationBucket",
  "durationMs",
  "utmSource",
  "utmMedium",
  "utmCampaign",
]);
const ATTRIBUTED_CONVERSION_EVENTS = new Set([
  "pdf_upload_started",
  "pdf_upload_completed",
  "editor_opened",
  "export_started",
  "export_succeeded",
  "pdf_downloaded",
  "result_downloaded",
  "signup_completed",
  "upload_started",
  "document_opened",
  "account_signed_up",
]);
const VISITOR_KEY = "pdfenrich_analytics_visitor_id_v2";
const LEGACY_VISITOR_KEY = "realpdf_analytics_visitor_id";
const SESSION_KEY = "pdfenrich_analytics_session_id_v1";
const INTERNAL_TRAFFIC_KEY = "pdfenrich_internal_traffic_v1";
const ATTRIBUTION_KEY = "pdfenrich_session_attribution_v1";
const PAGE_VIEWS_KEY = "pdfenrich_session_page_views_v1";
const DEFAULT_ANALYTICS_API_BASE_URL = "https://us-central1-pdf-editor-1137a.cloudfunctions.net/analyticsApi";
const ANALYTICS_API_BASE_URL = String(import.meta.env.VITE_ANALYTICS_API_BASE_URL || DEFAULT_ANALYTICS_API_BASE_URL).replace(/\/+$/, "");
const memoryPageViews = new Set();

function safeHostname(value) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "").slice(0, 120);
  } catch {
    return "";
  }
}

function safeCampaignParameters(searchParams) {
  const safeValue = (key, maximum) => String(searchParams.get(key) || "")
    .replace(/[^A-Za-z0-9._~-]/g, "-")
    .slice(0, maximum);
  const utmSource = safeValue("utm_source", 80);
  const utmMedium = safeValue("utm_medium", 80);
  const utmCampaign = safeValue("utm_campaign", 120);
  return {
    ...(utmSource ? { utmSource } : {}),
    ...(utmMedium ? { utmMedium } : {}),
    ...(utmCampaign ? { utmCampaign } : {}),
  };
}

function classifyTrafficSource(referrerDomain, searchParams) {
  if (searchParams.has("utm_source")) return "campaign";
  if (!referrerDomain) return "direct";
  if (/(^|\.)(google)\./.test(referrerDomain)) return "google";
  if (/(^|\.)(bing)\./.test(referrerDomain)) return "bing";
  if (/(^|\.)(reddit)\./.test(referrerDomain)) return "reddit";
  if (/(^|\.)(chatgpt|openai)\./.test(referrerDomain)) return "chatgpt";
  if (/(^|\.)(facebook|instagram)\./.test(referrerDomain)) return "facebook";
  if (/(^|\.)(twitter|x)\./.test(referrerDomain)) return "x";
  return "other";
}

export function currentTrafficAttribution() {
  if (typeof window === "undefined") return { trafficSource: "direct", referrerDomain: "", landingPath: "/" };
  const analyticsAllowed = optionalAnalyticsAllowed();
  if (analyticsAllowed) {
    try {
      const stored = JSON.parse(window.sessionStorage.getItem(ATTRIBUTION_KEY) || "null");
      if (stored?.trafficSource && stored?.landingPath) return stored;
    } catch {
      // Storage can be unavailable; calculate a privacy-safe attribution in memory.
    }
  }
  const referrerDomain = safeHostname(document.referrer);
  const ownDomain = safeHostname(window.location.origin);
  const externalReferrer = referrerDomain && referrerDomain !== ownDomain ? referrerDomain : "";
  const searchParams = new URLSearchParams(window.location.search);
  const attribution = {
    trafficSource: classifyTrafficSource(externalReferrer, searchParams),
    referrerDomain: externalReferrer,
    landingPath: privacySafeRoute(window.location.pathname),
    ...safeCampaignParameters(searchParams),
  };
  if (analyticsAllowed) {
    try { window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution)); } catch { /* Keep attribution in memory. */ }
  }
  return attribution;
}

function randomIdentifier(prefix) {
  const random = globalThis.crypto?.randomUUID?.().replaceAll("-", "")
    || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${random}`;
}

export function currentVisitorId() {
  try {
    const current = window.localStorage.getItem(VISITOR_KEY);
    if (/^anon_[A-Za-z0-9_-]{16,80}$/.test(current || "")) return current;
    const legacy = window.localStorage.getItem(LEGACY_VISITOR_KEY);
    const created = legacy
      ? `anon_${legacy.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 75)}`
      : randomIdentifier("anon");
    window.localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    return randomIdentifier("anon");
  }
}

export function currentSessionId() {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (/^session_[A-Za-z0-9_-]{16,80}$/.test(existing || "")) return existing;
    const created = randomIdentifier("session");
    window.sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return randomIdentifier("session");
  }
}

export function isInternalTrafficDevice() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(INTERNAL_TRAFFIC_KEY) === "true";
  } catch {
    return false;
  }
}

export function setInternalTrafficDevice(excluded) {
  if (typeof window === "undefined") return false;
  try {
    if (excluded) window.localStorage.setItem(INTERNAL_TRAFFIC_KEY, "true");
    else window.localStorage.removeItem(INTERNAL_TRAFFIC_KEY);
    return isInternalTrafficDevice();
  } catch {
    return false;
  }
}

export function fileSizeBucket(bytes = 0) {
  if (bytes < 1024 * 1024) return "under_1mb";
  if (bytes < 5 * 1024 * 1024) return "1_5mb";
  if (bytes < 10 * 1024 * 1024) return "5_10mb";
  if (bytes < 25 * 1024 * 1024) return "10_25mb";
  return "25mb_plus";
}

export function pageCountBucket(count = 0) {
  if (count <= 5) return "1_5";
  if (count <= 20) return "6_20";
  if (count <= 50) return "21_50";
  return "51_100";
}

export function durationBucket(milliseconds = 0) {
  if (milliseconds < 1000) return "under_1s";
  if (milliseconds < 3000) return "1_3s";
  if (milliseconds < 6000) return "3_6s";
  if (milliseconds < 15000) return "6_15s";
  if (milliseconds < 30000) return "15_30s";
  return "30s_plus";
}

export function clientEnvironment() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { deviceClass: "unknown", browserFamily: "unknown" };
  }
  const userAgent = navigator.userAgent || "";
  let browserFamily = "other";
  if (/Edg\//.test(userAgent)) browserFamily = "edge";
  else if (/Firefox\//.test(userAgent)) browserFamily = "firefox";
  else if (/Chrome\//.test(userAgent)) browserFamily = "chrome";
  else if (/Safari\//.test(userAgent)) browserFamily = "safari";
  return {
    deviceClass: window.innerWidth <= 640 ? "mobile" : window.innerWidth <= 1024 ? "tablet" : "desktop",
    browserFamily,
  };
}

export function sanitizeAnalyticsProperties(properties = {}) {
  return Object.fromEntries(Object.entries(properties).flatMap(([key, value]) => {
    if (!ALLOWED_PROPERTIES.has(key) || !["string", "number", "boolean"].includes(typeof value)) return [];
    if (typeof value === "string") {
      const sanitizedValue = key === "route" || key === "landingPath"
        ? privacySafeRoute(value)
        : value.slice(0, 160);
      return [[key, sanitizedValue]];
    }
    if (typeof value === "number" && !Number.isFinite(value)) return [];
    if (key === "durationMs") return [[key, Math.max(0, Math.min(Math.round(value), 30 * 60 * 1000))]];
    return [[key, value]];
  }));
}

export function analyticsPersistenceProperties(properties = {}) {
  return Object.fromEntries(Object.entries(properties).filter(([key]) => FIRESTORE_ANALYTICS_PROPERTIES.has(key)));
}

async function persistProductEvent(event) {
  if (!optionalAnalyticsAllowed() || typeof window === "undefined" || !ANALYTICS_API_BASE_URL) return false;
  try {
    const [{ appCheck, auth }, { getToken: getAppCheckToken }] = await Promise.all([
      import("../firebase.js"),
      import("firebase/app-check"),
    ]);
    const headers = { "Content-Type": "application/json" };
    const user = auth?.currentUser;
    if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
    if (appCheck) {
      const result = await getAppCheckToken(appCheck, false);
      if (result?.token) headers["X-Firebase-AppCheck"] = result.token;
    }
    const attribution = currentTrafficAttribution();
    const environment = clientEnvironment();
    const response = await fetch(`${ANALYTICS_API_BASE_URL}/v1/events`, {
      method: "POST",
      headers,
      keepalive: true,
      body: JSON.stringify({
        eventName: event.name,
        visitorId: currentVisitorId(),
        sessionId: currentSessionId(),
        path: privacySafeRoute(window.location.pathname),
        internalTraffic: isInternalTrafficDevice(),
        deviceCategory: environment.deviceClass,
        browserFamily: environment.browserFamily,
        trafficSource: attribution.trafficSource,
        referrerDomain: attribution.referrerDomain,
        properties: analyticsPersistenceProperties(event.properties),
        clientOccurredAt: new Date().toISOString(),
      }),
    });
    return response.ok;
  } catch (error) {
    if (import.meta.env.DEV) {
      const diagnosticCode = String(error?.code || error?.name || "analytics_error")
        .replace(/[^A-Za-z0-9_.:/-]/g, "")
        .slice(0, 64);
      console.warn("[PDFEnrich analytics] Event storage failed", { code: diagnosticCode });
    }
    return false;
  }
}

function buildEvent(name, properties = {}) {
  if (!ALLOWED_EVENTS.has(name)) return null;
  const attribution = typeof window !== "undefined" && ATTRIBUTED_CONVERSION_EVENTS.has(name)
    ? currentTrafficAttribution()
    : {};
  return { name, properties: sanitizeAnalyticsProperties({ ...attribution, ...properties }) };
}

function dispatchProductEvent(event) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("pdfenrich:analytics", { detail: event }));
  queueGoogleAnalyticsEvent(event);
}

function queueProductEventPersistence(event) {
  if (!optionalAnalyticsAllowed()) return;
  const isLowPriorityPageView = ["page_view", "page_viewed", "homepage_viewed"].includes(event.name);
  if (!isLowPriorityPageView) {
    void persistProductEvent(event);
    return;
  }
  const persistAfterLoad = () => window.setTimeout(() => void persistProductEvent(event), 1500);
  if (document.readyState === "complete") persistAfterLoad();
  else window.addEventListener("load", persistAfterLoad, { once: true });
}

export function trackProductEvent(name, properties = {}) {
  const event = buildEvent(name, properties);
  if (!event) return false;
  if (typeof window !== "undefined") {
    dispatchProductEvent(event);
    queueProductEventPersistence(event);
  }
  if (import.meta.env.DEV) console.info("[PDFEnrich analytics]", event);
  return true;
}

export async function trackProductEventAsync(name, properties = {}) {
  const event = buildEvent(name, properties);
  if (!event || typeof window === "undefined") return false;
  dispatchProductEvent(event);
  return persistProductEvent(event);
}

export function trackToolUpload(toolId, file, { pageCount } = {}) {
  return trackProductEvent("pdf_upload_completed", {
    toolId,
    fileSizeBucket: fileSizeBucket(file?.size || 0),
    ...(Number.isFinite(pageCount) ? { pageCountBucket: pageCountBucket(pageCount) } : {}),
    ...clientEnvironment(),
  });
}

export function trackUploadValidationFailure(toolId, errorCategory = "invalid_file") {
  return trackProductEvent("pdf_upload_failed", {
    toolId,
    errorCategory,
    ...clientEnvironment(),
  });
}

export function beginToolOperation(toolId, { operation = "export", slowAfterMs = 6000 } = {}) {
  const startedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  const environment = clientEnvironment();
  let completed = false;
  trackProductEvent("export_started", { toolId, operation, ...environment });
  const finish = (name, properties = {}) => {
    if (completed) return false;
    completed = true;
    const finishedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    const durationMs = Math.max(0, finishedAt - startedAt);
    const timing = { durationMs, durationBucket: durationBucket(durationMs) };
    trackProductEvent(name, { toolId, operation, ...environment, ...timing, ...properties });
    if (durationMs >= slowAfterMs) trackProductEvent("slow_operation", { toolId, operation, ...environment, ...timing });
    return true;
  };
  return {
    succeed(properties = {}) { return finish("export_succeeded", properties); },
    fail(errorCategory = "processing_error", properties = {}) { return finish("export_failed", { errorCategory, ...properties }); },
  };
}

export function trackPageView(route = "/") {
  if (typeof window === "undefined") return false;
  const normalizedRoute = privacySafeRoute(route);
  if (!optionalAnalyticsAllowed()) {
    if (memoryPageViews.has(normalizedRoute)) return false;
    memoryPageViews.add(normalizedRoute);
  } else {
    try {
      const viewed = new Set(JSON.parse(window.sessionStorage.getItem(PAGE_VIEWS_KEY) || "[]"));
      if (viewed.has(normalizedRoute)) return false;
      viewed.add(normalizedRoute);
      window.sessionStorage.setItem(PAGE_VIEWS_KEY, JSON.stringify([...viewed].slice(-100)));
    } catch {
      if (memoryPageViews.has(normalizedRoute)) return false;
      memoryPageViews.add(normalizedRoute);
    }
  }
  trackProductEvent("page_view", { route: normalizedRoute, ...currentTrafficAttribution() });
  return true;
}

export function trackComparisonCta(route, placement) {
  return trackProductEvent("comparison_cta_clicked", {
    route: String(route || "/compare").split("?")[0],
    operation: String(placement || "unknown"),
    ...clientEnvironment(),
  });
}

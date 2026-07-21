const ALLOWED_EVENTS = new Set([
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
  "optional_account_created",
  "account_signed_up",
  "account_logged_in",
  "pdf_downloaded",
  "task_feedback_submitted",
  "client_error",
  "unhandled_rejection",
  "slow_operation",
]);

const ALLOWED_PROPERTIES = new Set(["toolId", "fileSizeBucket", "pageCountBucket", "errorCategory", "result", "authMethod", "route", "operation", "durationBucket", "trafficSource", "referrerDomain", "landingPath"]);
const ANALYTICS_COLLECTION = "productAnalyticsEvents";
const VISITOR_KEY = "realpdf_analytics_visitor_id";
const ATTRIBUTION_KEY = "fixthatpdf_session_attribution_v1";
const PAGE_VIEWS_KEY = "fixthatpdf_session_page_views_v1";
const ANALYTICS_RETENTION_DAYS = 400;
const memoryPageViews = new Set();

function safeHostname(value) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "").slice(0, 120);
  } catch {
    return "";
  }
}

function classifyTrafficSource(referrerDomain, searchParams) {
  const medium = (searchParams.get("utm_medium") || "").toLowerCase();
  if (/(^|_)(cpc|ppc|paid|display|affiliate)(_|$)/.test(medium)) return "paid";
  if (/(^|_)(email|newsletter)(_|$)/.test(medium)) return "email";
  if (/(^|_)(social|social-network)(_|$)/.test(medium)) return "social";
  if (/(^|_)(organic|search)(_|$)/.test(medium)) return "organic";
  if (searchParams.has("utm_source")) return "campaign";
  if (!referrerDomain) return "direct";
  if (/(^|\.)(google|bing|yahoo|duckduckgo|ecosia|baidu|yandex|brave)\./.test(referrerDomain)) return "organic";
  if (/(^|\.)(facebook|instagram|linkedin|tiktok|twitter|x|reddit|youtube|pinterest)\./.test(referrerDomain)) return "social";
  return "referral";
}

export function currentTrafficAttribution() {
  if (typeof window === "undefined") return { trafficSource: "direct", referrerDomain: "", landingPath: "/" };
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(ATTRIBUTION_KEY) || "null");
    if (stored?.trafficSource && stored?.landingPath) return stored;
  } catch {
    // Storage can be unavailable; calculate a privacy-safe attribution in memory.
  }
  const referrerDomain = safeHostname(document.referrer);
  const ownDomain = safeHostname(window.location.origin);
  const externalReferrer = referrerDomain && referrerDomain !== ownDomain ? referrerDomain : "";
  const attribution = {
    trafficSource: classifyTrafficSource(externalReferrer, new URLSearchParams(window.location.search)),
    referrerDomain: externalReferrer,
    landingPath: (window.location.pathname || "/").slice(0, 160),
  };
  try { window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution)); } catch { /* Keep attribution in this event only. */ }
  return attribution;
}

function visitorId() {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const created = globalThis.crypto?.randomUUID?.() || `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    return `session-${Math.random().toString(36).slice(2)}`;
  }
}

async function persistProductEvent(event) {
  try {
    const [{ auth, db }, { addDoc, collection, serverTimestamp, Timestamp }] = await Promise.all([
      import("../firebase.js"),
      import("firebase/firestore"),
    ]);
    if (!db) return;
    await addDoc(collection(db, ANALYTICS_COLLECTION), {
      name: event.name,
      properties: event.properties,
      actorId: auth?.currentUser?.uid || null,
      visitorId: visitorId(),
      occurredAt: serverTimestamp(),
      clientOccurredAt: new Date().toISOString(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + ANALYTICS_RETENTION_DAYS * 24 * 60 * 60 * 1000)),
    });
  } catch (error) {
    if (import.meta.env.DEV) console.warn("[RealPDF analytics] Event storage failed", error?.code || error?.message);
  }
}

function queueProductEventPersistence(event) {
  const isLowPriorityPageView = ["page_viewed", "homepage_viewed"].includes(event.name);
  if (!isLowPriorityPageView) {
    void persistProductEvent(event);
    return;
  }

  // Page-view storage loads the optional Firebase client. Keep that work out of
  // the homepage's critical rendering path so the hero and upload control win
  // the initial network/main-thread budget. Conversion and error events remain
  // immediate; page views begin after the page is fully loaded.
  const persistAfterLoad = () => window.setTimeout(() => void persistProductEvent(event), 1500);
  if (document.readyState === "complete") persistAfterLoad();
  else window.addEventListener("load", persistAfterLoad, { once: true });
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

export function sanitizeAnalyticsProperties(properties = {}) {
  return Object.fromEntries(Object.entries(properties).flatMap(([key, value]) => {
    if (!ALLOWED_PROPERTIES.has(key) || !["string", "number", "boolean"].includes(typeof value)) return [];
    if (typeof value === "string") return [[key, value.slice(0, 160)]];
    if (typeof value === "number" && !Number.isFinite(value)) return [];
    return [[key, value]];
  }));
}

export function trackProductEvent(name, properties = {}) {
  if (!ALLOWED_EVENTS.has(name)) return false;
  const event = { name, properties: sanitizeAnalyticsProperties(properties) };
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("realpdf:analytics", { detail: event }));
    queueProductEventPersistence(event);
  }
  if (import.meta.env.DEV) console.info("[FixThatPDF analytics]", event);
  return true;
}

export function trackPageView(route = "/") {
  if (typeof window === "undefined") return false;
  const normalizedRoute = String(route || "/").split("?")[0].slice(0, 160);
  try {
    const viewed = new Set(JSON.parse(window.sessionStorage.getItem(PAGE_VIEWS_KEY) || "[]"));
    if (viewed.has(normalizedRoute)) return false;
    viewed.add(normalizedRoute);
    window.sessionStorage.setItem(PAGE_VIEWS_KEY, JSON.stringify([...viewed].slice(-100)));
  } catch {
    if (memoryPageViews.has(normalizedRoute)) return false;
    memoryPageViews.add(normalizedRoute);
  }
  const properties = { route: normalizedRoute, ...currentTrafficAttribution() };
  trackProductEvent("page_viewed", properties);
  if (normalizedRoute === "/") trackProductEvent("homepage_viewed", properties);
  return true;
}

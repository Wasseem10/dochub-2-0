const ALLOWED_EVENTS = new Set([
  "homepage_viewed",
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

const ALLOWED_PROPERTIES = new Set(["toolId", "fileSizeBucket", "pageCountBucket", "errorCategory", "result", "authMethod", "route", "operation", "durationBucket"]);
const ANALYTICS_COLLECTION = "productAnalyticsEvents";
const VISITOR_KEY = "realpdf_analytics_visitor_id";
const ANALYTICS_RETENTION_DAYS = 400;

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
    void persistProductEvent(event);
  }
  if (import.meta.env.DEV) console.info("[FixThatPDF analytics]", event);
  return true;
}

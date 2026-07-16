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
  "task_feedback_submitted",
]);

const ALLOWED_PROPERTIES = new Set(["toolId", "fileSizeBucket", "pageCountBucket", "errorCategory", "result"]);

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
  return Object.fromEntries(Object.entries(properties).filter(([key, value]) => ALLOWED_PROPERTIES.has(key) && ["string", "number", "boolean"].includes(typeof value)));
}

export function trackProductEvent(name, properties = {}) {
  if (!ALLOWED_EVENTS.has(name)) return false;
  const event = { name, properties: sanitizeAnalyticsProperties(properties) };
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("realpdf:analytics", { detail: event }));
  if (import.meta.env.DEV) console.info("[FixThatPDF analytics]", event);
  return true;
}

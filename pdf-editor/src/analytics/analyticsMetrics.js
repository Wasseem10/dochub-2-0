export const ANALYTICS_RANGE_DAYS = Object.freeze({
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
});

export function analyticsRangeStart(range, now = new Date()) {
  const days = ANALYTICS_RANGE_DAYS[range];
  if (!days) return null;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function eventDate(event) {
  const value = event?.occurredAt?.toDate?.() || event?.clientOccurredAt || event?.occurredAt;
  const date = value instanceof Date ? value : new Date(value || 0);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

export function filterAnalyticsEvents(events, range, now = new Date()) {
  const rangeStart = analyticsRangeStart(range, now);
  if (!rangeStart) return [...events];
  const cutoff = new Date(rangeStart).getTime();
  return events.filter((event) => eventDate(event).getTime() >= cutoff);
}

export function summarizeAnalyticsEvents(events) {
  const count = (name) => events.filter((event) => event.name === name).length;
  const signups = count("account_signed_up");
  const logins = count("account_logged_in");
  const googleAuth = events.filter((event) => (
    ["account_signed_up", "account_logged_in"].includes(event.name)
    && event.properties?.authMethod === "google"
  )).length;
  const uploads = count("document_opened");
  const downloads = count("pdf_downloaded");
  const activeUsers = new Set(events.map((event) => event.actorId || event.visitorId).filter(Boolean)).size;
  const clientErrors = events.filter((event) => ["client_error", "unhandled_rejection"].includes(event.name)).length;
  const failedExports = count("export_failed");
  const slowOperations = count("slow_operation");
  const pageViews = count("page_viewed");
  const organicVisits = events.filter((event) => event.name === "page_viewed" && event.properties?.trafficSource === "organic").length;

  return {
    signups,
    logins,
    googleAuth,
    uploads,
    downloads,
    activeUsers,
    clientErrors,
    failedExports,
    slowOperations,
    pageViews,
    organicVisits,
    organicRate: pageViews ? Math.round((organicVisits / pageViews) * 100) : 0,
    conversionRate: uploads ? Math.round((downloads / uploads) * 100) : 0,
  };
}

export function groupAnalyticsProperty(events, property, { eventName = "page_viewed", limit = 6 } = {}) {
  const counts = new Map();
  for (const event of events) {
    if (eventName && event.name !== eventName) continue;
    const value = String(event.properties?.[property] || "unknown").slice(0, 160);
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function createDailyAnalyticsSeries(events, days = 14, now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (days - index - 1));
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const dayEvents = events.filter((event) => {
      const timestamp = eventDate(event).getTime();
      return timestamp >= date.getTime() && timestamp < next.getTime();
    });
    return {
      key: date.toISOString().slice(0, 10),
      label: formatter.format(date),
      events: dayEvents.length,
      users: new Set(dayEvents.map((event) => event.actorId || event.visitorId).filter(Boolean)).size,
    };
  });
}

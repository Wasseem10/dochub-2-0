export const ANALYTICS_RANGE_DAYS = Object.freeze({
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
});

export const PRIORITY_ONE_TOOL_IDS = Object.freeze([
  "edit-pdf",
  "merge-pdf",
  "split-pdf",
  "compress-pdf",
  "pdf-to-word",
  "pdf-to-excel",
  "pdf-to-powerpoint",
  "pdf-to-html",
  "word-to-pdf",
  "excel-to-pdf",
  "powerpoint-to-pdf",
  "html-to-pdf",
  "jpg-to-pdf",
  "png-to-pdf",
  "pdf-to-jpg",
  "pdf-to-png",
  "ocr-pdf",
  "sign-pdf",
  "protect-pdf",
  "unlock-pdf",
  "compare-pdf",
]);

export const ANALYTICS_FEATURES = Object.freeze({
  add_text_used: "Add Text",
  edit_text_used: "Edit Text",
  add_image_used: "Add Image",
  signature_used: "Signature",
  highlight_used: "Highlight",
  draw_used: "Draw",
  annotation_used: "Annotation",
  page_added: "Add Page",
  page_deleted: "Delete Page",
  page_rotated: "Rotate Page",
  page_reordered: "Reorder Page",
  undo_used: "Undo",
  redo_used: "Redo",
});

const EVENT_ALIASES = Object.freeze({
  page_viewed: "page_view",
  homepage_viewed: "page_view",
  // This legacy event was emitted only after a PDF parsed successfully.
  upload_started: "pdf_upload_completed",
  upload_validation_failed: "pdf_upload_failed",
  document_opened: "editor_opened",
  account_signed_up: "signup_completed",
  account_logged_in: "login_completed",
});

export function canonicalAnalyticsEventName(name) {
  return EVENT_ALIASES[name] || name;
}

export function analyticsVisitorKey(event) {
  return event?.visitorId || (event?.actorId ? `user:${event.actorId}` : "");
}

function eventsNamed(events, name) {
  return events.filter((event) => canonicalAnalyticsEventName(event.name) === name);
}

function uniqueVisitors(events) {
  return new Set(events.map(analyticsVisitorKey).filter(Boolean));
}

function percent(value, total) {
  return total ? Math.round((value / total) * 100) : 0;
}

export function createFeatureUsage(events, sortBy = "uses") {
  return Object.entries(ANALYTICS_FEATURES)
    .map(([eventName, label]) => {
      const matching = eventsNamed(events, eventName);
      return {
        eventName,
        label,
        uses: matching.length,
        uniqueUsers: uniqueVisitors(matching).size,
      };
    })
    .filter((feature) => feature.uses > 0)
    .sort((left, right) => (
      sortBy === "uniqueUsers"
        ? right.uniqueUsers - left.uniqueUsers || right.uses - left.uses
        : right.uses - left.uses || right.uniqueUsers - left.uniqueUsers
    ));
}

export function createProductFunnel(events) {
  const byVisitor = new Map();
  for (const event of [...events].sort((left, right) => eventDate(left) - eventDate(right))) {
    const visitor = analyticsVisitorKey(event);
    if (!visitor) continue;
    const rows = byVisitor.get(visitor) || [];
    rows.push(canonicalAnalyticsEventName(event.name));
    byVisitor.set(visitor, rows);
  }
  const featureNames = new Set(Object.keys(ANALYTICS_FEATURES));
  const stageDefinitions = [
    { key: "visitors", label: "Unique Visitors", match: () => true },
    { key: "uploads", label: "Uploaded PDF", match: (name) => name === "pdf_upload_completed" },
    { key: "editorOpens", label: "Opened Editor", match: (name) => name === "editor_opened" },
    { key: "featureUsers", label: "Used Editor Feature", match: (name) => featureNames.has(name) },
    { key: "downloads", label: "Downloaded PDF", match: (name) => name === "pdf_downloaded" },
    { key: "accounts", label: "Created Account", match: (name) => name === "signup_completed" },
  ];
  const counts = Array(stageDefinitions.length).fill(0);
  for (const names of byVisitor.values()) {
    counts[0] += 1;
    let cursor = 0;
    for (let stage = 1; stage < stageDefinitions.length; stage += 1) {
      const found = names.findIndex((name, index) => index >= cursor && stageDefinitions[stage].match(name));
      if (found < 0) break;
      counts[stage] += 1;
      cursor = found + 1;
    }
  }
  return stageDefinitions.map((stage, index) => ({
    ...stage,
    match: undefined,
    value: counts[index],
    fromPreviousRate: index ? percent(counts[index], counts[index - 1]) : 100,
  }));
}

export function createPrivateAnalyticsSummary(events) {
  const visitors = uniqueVisitors(events);
  const pageViews = eventsNamed(events, "page_view");
  const uploads = eventsNamed(events, "pdf_upload_completed");
  const editorOpens = eventsNamed(events, "editor_opened");
  const saves = eventsNamed(events, "pdf_saved");
  const downloads = eventsNamed(events, "pdf_downloaded");
  const accounts = eventsNamed(events, "signup_completed");
  const featureEvents = events.filter((event) => ANALYTICS_FEATURES[canonicalAnalyticsEventName(event.name)]);
  const visitorCount = visitors.size;
  const uploadVisitors = uniqueVisitors(uploads).size;
  const editorVisitors = uniqueVisitors(editorOpens).size;
  const featureVisitors = uniqueVisitors(featureEvents).size;
  const downloadVisitors = uniqueVisitors(downloads).size;
  const signupVisitors = uniqueVisitors(accounts).size;
  return {
    metrics: {
      uniqueVisitors: visitorCount,
      pageViews: pageViews.length,
      uploads: uploads.length,
      editorOpens: editorOpens.length,
      saves: saves.length,
      downloads: downloads.length,
      accounts: accounts.length,
    },
    conversions: {
      visitorToUpload: percent(uploadVisitors, visitorCount),
      uploadToEditor: percent(editorVisitors, uploadVisitors),
      editorToDownload: percent(downloadVisitors, editorVisitors),
      visitorToSignup: percent(signupVisitors, visitorCount),
    },
    productUsage: {
      uploadVisitors,
      editorVisitors,
      featureVisitors,
      downloadVisitors,
    },
    funnel: createProductFunnel(events),
  };
}

export function createAuthenticationBreakdown(events, eventName = "pdf_downloaded") {
  const matching = eventsNamed(events, eventName);
  const signedIn = matching.filter((event) => Boolean(event.actorId)).length;
  const anonymous = matching.length - signedIn;
  return {
    eventName,
    total: matching.length,
    anonymous,
    signedIn,
    anonymousRate: percent(anonymous, matching.length),
    signedInRate: percent(signedIn, matching.length),
  };
}

export function groupTopLevelAnalyticsField(events, field, { eventName = "page_view", limit = 8 } = {}) {
  const counts = new Map();
  for (const event of events) {
    if (eventName && canonicalAnalyticsEventName(event.name) !== eventName) continue;
    const value = String(event[field] || event.properties?.[field] || "unknown").slice(0, 120);
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
    .slice(0, limit);
}

export function createProductDailySeries(events, start, end) {
  const first = new Date(start);
  const last = new Date(end);
  first.setHours(0, 0, 0, 0);
  last.setHours(0, 0, 0, 0);
  const days = [];
  for (let cursor = new Date(first); cursor <= last && days.length < 92; cursor.setDate(cursor.getDate() + 1)) {
    const key = cursor.toISOString().slice(0, 10);
    const next = new Date(cursor);
    next.setDate(next.getDate() + 1);
    const rows = events.filter((event) => {
      const time = eventDate(event).getTime();
      return time >= cursor.getTime() && time < next.getTime();
    });
    days.push({
      key,
      label: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(cursor),
      visitors: uniqueVisitors(rows).size,
      uploads: eventsNamed(rows, "pdf_upload_completed").length,
      downloads: eventsNamed(rows, "pdf_downloaded").length,
    });
  }
  return days;
}

function percentile(values, ratio) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
}

export function createToolQualityScorecard(events, toolIds = PRIORITY_ONE_TOOL_IDS) {
  return toolIds.map((toolId) => {
    const toolEvents = events.filter((event) => event.properties?.toolId === toolId);
    const count = (name) => toolEvents.filter((event) => event.name === name).length;
    const starts = count("export_started");
    const successes = count("export_succeeded");
    const failures = count("export_failed");
    const attempts = Math.max(starts, successes + failures);
    const durations = toolEvents
      .filter((event) => event.name === "export_succeeded" && Number.isFinite(event.properties?.durationMs))
      .map((event) => event.properties.durationMs);
    const failedByDevice = Object.fromEntries(["desktop", "mobile", "unknown"].map((deviceClass) => [
      deviceClass,
      toolEvents.filter((event) => event.name === "export_failed" && (event.properties?.deviceClass || "unknown") === deviceClass).length,
    ]));

    const resultDownloads = count("result_downloaded");
    const downloads = Math.max(resultDownloads, count("pdf_downloaded"));
    return {
      toolId,
      uploads: count("upload_started"),
      validationFailures: count("upload_validation_failed"),
      attempts,
      successes,
      failures,
      downloads,
      successRate: attempts ? Math.round((successes / attempts) * 100) : null,
      uploadToDownloadRate: count("upload_started") ? Math.round((downloads / count("upload_started")) * 100) : null,
      medianDurationMs: percentile(durations, 0.5),
      p95DurationMs: percentile(durations, 0.95),
      failedByDevice,
    };
  });
}

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

function isGoogleOrganicEvent(event) {
  const source = event.properties?.trafficSource;
  const referrer = String(event.properties?.referrerDomain || "").toLowerCase();
  return source === "organic" && /(^|\.)google\./.test(referrer);
}

function percentage(value, total) {
  return total ? Math.round((value / total) * 100) : 0;
}

function conversionEventTime(event) {
  const clientDate = new Date(event?.clientOccurredAt || 0);
  if (!Number.isNaN(clientDate.getTime()) && clientDate.getTime() > 0) return clientDate.getTime();
  return eventDate(event).getTime();
}

export function createGoogleSearchConversionFunnel(events) {
  const visitors = new Map();
  const orderedEvents = [...events].sort((left, right) => conversionEventTime(left) - conversionEventTime(right));

  for (const event of orderedEvents) {
    const visitorId = event.visitorId;
    if (!visitorId) continue;
    const existing = visitors.get(visitorId) || {
      googleVisitAt: null,
      uploadAt: null,
      completionAt: null,
      signupAt: null,
    };
    const timestamp = conversionEventTime(event);
    if (!existing.googleVisitAt && event.name === "page_viewed" && isGoogleOrganicEvent(event)) {
      existing.googleVisitAt = timestamp;
    } else if (existing.googleVisitAt && !existing.uploadAt && event.name === "upload_started" && timestamp >= existing.googleVisitAt) {
      existing.uploadAt = timestamp;
    } else if (existing.uploadAt && !existing.completionAt && event.name === "export_succeeded" && timestamp >= existing.uploadAt) {
      existing.completionAt = timestamp;
    } else if (existing.completionAt && !existing.signupAt && event.name === "account_signed_up" && timestamp >= existing.completionAt) {
      existing.signupAt = timestamp;
    }
    visitors.set(visitorId, existing);
  }

  const googleVisitors = [...visitors.values()].filter(({ googleVisitAt }) => googleVisitAt).length;
  const uploads = [...visitors.values()].filter(({ uploadAt }) => uploadAt).length;
  const completedPdfs = [...visitors.values()].filter(({ completionAt }) => completionAt).length;
  const signups = [...visitors.values()].filter(({ signupAt }) => signupAt).length;

  return {
    googleVisitors,
    uploads,
    completedPdfs,
    signups,
    visitToUploadRate: percentage(uploads, googleVisitors),
    uploadToCompletionRate: percentage(completedPdfs, uploads),
    completionToSignupRate: percentage(signups, completedPdfs),
    visitToSignupRate: percentage(signups, googleVisitors),
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

import { describe, expect, it, vi } from "vitest";
import { createAnalyticsApiHandler, createAnalyticsRateLimiter } from "../../functions/src/analyticsApi.js";
import { createProductAnalyticsService, validateAnalyticsPayload } from "../../functions/src/services/productAnalytics.js";
import { createPrivateAnalyticsSummary } from "../../src/analytics/analyticsMetrics.js";

const validPayload = Object.freeze({
  eventName: "pdf_upload_completed",
  visitorId: "anon_1234567890abcdef",
  sessionId: "session_1234567890abcdef",
  path: "/edit-pdf",
  internalTraffic: false,
  deviceCategory: "mobile",
  browserFamily: "safari",
  trafficSource: "google",
  referrerDomain: "google.com",
  properties: { toolId: "edit-pdf", fileSizeBucket: "1_5mb" },
  clientOccurredAt: "2026-08-07T12:00:00.000Z",
});

function request({ method = "POST", url = "/v1/events", token = "", body = validPayload, query = {} } = {}) {
  const headers = new Map([
    ["origin", "https://pdfenrich.com"],
    ["content-type", "application/json"],
    ...(token ? [["authorization", `Bearer ${token}`]] : []),
  ]);
  return {
    method,
    url,
    originalUrl: url,
    body,
    query,
    ip: "203.0.113.8",
    get: (name) => headers.get(name.toLowerCase()) || "",
  };
}

function response() {
  return {
    headers: {},
    statusCode: 0,
    payload: null,
    set(values) { Object.assign(this.headers, values); return this; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.payload = value; return this; },
    end() { return this; },
  };
}

function backend({ claim = false } = {}) {
  const analytics = {
    record: vi.fn(async (payload, identity) => ({ id: "event-1", eventName: payload.eventName, identity })),
    list: vi.fn(async () => ({ events: [], truncated: false })),
  };
  return {
    analytics,
    admin: {
      auth: { verifyIdToken: vi.fn(async () => ({ uid: "verified-user", pdfenrichAdmin: claim })) },
      appCheck: { verifyToken: vi.fn() },
    },
    config: { allowedOrigins: new Set(["https://pdfenrich.com"]), requireAppCheck: false },
  };
}

describe("analytics API security", () => {
  it("records, queries, and summarizes an anonymous product journey end to end", async () => {
    const rows = [];
    const makeQuery = (filters = [], maximum = Infinity) => ({
      where(field, operator, value) { return makeQuery([...filters, { field, operator, value }], maximum); },
      limit(value) { return makeQuery(filters, value); },
      async get() {
        const filtered = rows.filter((row) => filters.every(({ field, operator, value }) => (
          operator === ">=" ? row.data[field] >= value : operator === "<=" ? row.data[field] <= value : row.data[field] === value
        ))).slice(0, maximum);
        return { size: filtered.length, docs: filtered.map((row) => ({ id: row.id, data: () => row.data })) };
      },
    });
    const db = { collection: () => ({
      async add(data) { const id = `event-${rows.length + 1}`; rows.push({ id, data }); return { id }; },
      orderBy() { return makeQuery(); },
    }) };
    const service = createProductAnalyticsService({ db });
    const names = ["page_view", "pdf_upload_completed", "editor_opened", "add_text_used", "pdf_downloaded"];
    for (const eventName of names) {
      await service.record({ ...validPayload, eventName }, null);
    }
    const result = await service.list({ start: "2026-08-07T00:00:00.000Z", end: "2026-08-08T00:00:00.000Z" });
    expect(result.events).toHaveLength(5);
    expect(createPrivateAnalyticsSummary(result.events)).toMatchObject({
      metrics: { uniqueVisitors: 1, uploads: 1, editorOpens: 1, downloads: 1 },
      productUsage: { featureVisitors: 1 },
    });
  });

  it("accepts anonymous events and derives signed-in identity from Firebase", async () => {
    const configured = backend();
    const handler = createAnalyticsApiHandler({ backendProvider: () => configured, rateLimiter: () => {} });
    const anonymousResponse = response();
    await handler(request(), anonymousResponse);
    expect(anonymousResponse.statusCode).toBe(202);
    expect(configured.analytics.record).toHaveBeenLastCalledWith(validPayload, null);

    const signedInResponse = response();
    await handler(request({ token: "verified" }), signedInResponse);
    expect(configured.analytics.record.mock.calls[1][1]).toMatchObject({ uid: "verified-user" });
  });

  it("denies the admin query to a normal authenticated user", async () => {
    const configured = backend({ claim: false });
    const handler = createAnalyticsApiHandler({ backendProvider: () => configured, rateLimiter: () => {} });
    const output = response();
    await handler(request({ method: "GET", url: "/v1/admin/events", token: "normal-user" }), output);
    expect(output.statusCode).toBe(403);
    expect(configured.analytics.list).not.toHaveBeenCalled();
  });

  it("allows only the custom-claim owner to query internal analytics", async () => {
    const configured = backend({ claim: true });
    const handler = createAnalyticsApiHandler({ backendProvider: () => configured, rateLimiter: () => {} });
    const output = response();
    await handler(request({ method: "GET", url: "/v1/admin/events", token: "owner", query: { includeInternal: "true" } }), output);
    expect(output.statusCode).toBe(200);
    expect(configured.analytics.list).toHaveBeenCalledWith(expect.objectContaining({ includeInternal: true }));
  });

  it("rejects spoofed identities, filenames, document content, and arbitrary properties", () => {
    const sensitiveFields = [
      { ...validPayload, userId: "another-user" },
      { ...validPayload, properties: { fileName: "private-tax-return.pdf" } },
      { ...validPayload, properties: { extractedText: "private content" } },
      { ...validPayload, properties: { signature: "data:image/png;base64,secret" } },
    ];
    for (const payload of sensitiveFields) {
      expect(() => validateAnalyticsPayload(payload, { now: new Date("2026-08-07T12:00:00.000Z") })).toThrow();
    }
  });

  it("marks internal traffic without discarding the event", () => {
    const event = validateAnalyticsPayload({ ...validPayload, internalTraffic: true }, {
      now: new Date("2026-08-07T12:00:00.000Z"),
    });
    expect(event.internalTraffic).toBe(true);
  });

  it("rate limits abusive event bursts without retaining the IP address", () => {
    const limiter = createAnalyticsRateLimiter({ limit: 2, now: () => 1000 });
    const input = request();
    expect(() => limiter(input)).not.toThrow();
    expect(() => limiter(input)).not.toThrow();
    expect(() => limiter(input)).toThrowError(/Too many analytics events/);
  });
});

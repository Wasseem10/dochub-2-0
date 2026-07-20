import { describe, expect, it } from "vitest";
import { createDailyAnalyticsSeries, filterAnalyticsEvents, summarizeAnalyticsEvents } from "../../src/analytics/analyticsMetrics.js";

const now = new Date("2026-07-20T12:00:00.000Z");

describe("owner analytics metrics", () => {
  const events = [
    { name: "account_signed_up", actorId: "user-1", visitorId: "visitor-1", clientOccurredAt: "2026-07-20T09:00:00.000Z", properties: { authMethod: "google" } },
    { name: "account_logged_in", actorId: "user-1", visitorId: "visitor-1", clientOccurredAt: "2026-07-20T10:00:00.000Z", properties: { authMethod: "google" } },
    { name: "document_opened", visitorId: "visitor-2", clientOccurredAt: "2026-07-19T10:00:00.000Z", properties: {} },
    { name: "pdf_downloaded", visitorId: "visitor-2", clientOccurredAt: "2026-07-19T10:05:00.000Z", properties: {} },
    { name: "homepage_viewed", visitorId: "old-visitor", clientOccurredAt: "2026-05-01T10:00:00.000Z", properties: {} },
  ];

  it("summarizes account, user, upload, and download usage", () => {
    expect(summarizeAnalyticsEvents(events)).toMatchObject({
      signups: 1,
      logins: 1,
      googleAuth: 2,
      uploads: 1,
      downloads: 1,
      activeUsers: 3,
      conversionRate: 100,
    });
  });

  it("filters ranges and produces daily activity", () => {
    const recent = filterAnalyticsEvents(events, "30d", now);
    expect(recent).toHaveLength(4);
    const series = createDailyAnalyticsSeries(recent, 2, now);
    expect(series.map((day) => day.events)).toEqual([2, 2]);
    expect(series.map((day) => day.users)).toEqual([1, 1]);
  });
});

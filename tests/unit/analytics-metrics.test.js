import { describe, expect, it } from "vitest";
import { priorityOneToolCoverage } from "../../config/priority-one-quality.mjs";
import { analyticsRangeStart, createAcquisitionBreakdown, createDailyAnalyticsSeries, createGoogleSearchConversionFunnel, createOutcomeOverview, createToolQualityScorecard, createToolUsage, filterAnalyticsEvents, groupAnalyticsProperty, PRIORITY_ONE_TOOL_IDS, summarizeAnalyticsEvents } from "../../src/analytics/analyticsMetrics.js";

const now = new Date("2026-07-20T12:00:00.000Z");

describe("owner analytics metrics", () => {
  const events = [
    { name: "account_signed_up", actorId: "user-1", visitorId: "visitor-1", clientOccurredAt: "2026-07-20T09:00:00.000Z", properties: { authMethod: "google" } },
    { name: "account_logged_in", actorId: "user-1", visitorId: "visitor-1", clientOccurredAt: "2026-07-20T10:00:00.000Z", properties: { authMethod: "google" } },
    { name: "document_opened", visitorId: "visitor-2", clientOccurredAt: "2026-07-19T10:00:00.000Z", properties: {} },
    { name: "pdf_downloaded", visitorId: "visitor-2", clientOccurredAt: "2026-07-19T10:05:00.000Z", properties: {} },
    { name: "homepage_viewed", visitorId: "old-visitor", clientOccurredAt: "2026-05-01T10:00:00.000Z", properties: {} },
    { name: "client_error", visitorId: "visitor-2", clientOccurredAt: "2026-07-20T10:06:00.000Z", properties: { errorCategory: "pdf_processing" } },
    { name: "export_failed", visitorId: "visitor-2", clientOccurredAt: "2026-07-20T10:07:00.000Z", properties: {} },
    { name: "slow_operation", visitorId: "visitor-2", clientOccurredAt: "2026-07-20T10:08:00.000Z", properties: { durationBucket: "3_6s" } },
    { name: "page_viewed", visitorId: "visitor-2", clientOccurredAt: "2026-07-20T10:09:00.000Z", properties: { trafficSource: "organic", landingPath: "/edit-pdf" } },
    { name: "page_viewed", visitorId: "visitor-3", clientOccurredAt: "2026-07-20T10:10:00.000Z", properties: { trafficSource: "direct", landingPath: "/" } },
  ];

  it("summarizes account, user, upload, and download usage", () => {
    expect(summarizeAnalyticsEvents(events)).toMatchObject({
      signups: 1,
      logins: 1,
      googleAuth: 2,
      uploads: 1,
      downloads: 1,
      activeUsers: 4,
      conversionRate: 100,
      clientErrors: 1,
      failedExports: 1,
      slowOperations: 1,
      pageViews: 2,
      organicVisits: 1,
      organicRate: 50,
    });
  });

  it("groups acquisition sources and landing pages", () => {
    expect(groupAnalyticsProperty(events, "trafficSource")).toEqual([{ label: "direct", value: 1 }, { label: "organic", value: 1 }]);
    expect(groupAnalyticsProperty(events, "landingPath")).toEqual([{ label: "/", value: 1 }, { label: "/edit-pdf", value: 1 }]);
  });

  it("filters ranges and produces daily activity", () => {
    expect(analyticsRangeStart("30d", now)).toBe("2026-06-20T12:00:00.000Z");
    expect(analyticsRangeStart("all", now)).toBeNull();
    const recent = filterAnalyticsEvents(events, "30d", now);
    expect(recent).toHaveLength(9);
    const series = createDailyAnalyticsSeries(recent, 2, now);
    expect(series.map((day) => day.events)).toEqual([2, 7]);
    expect(series.map((day) => day.users)).toEqual([1, 3]);
  });

  it("builds per-tool success, conversion, timing, and device metrics", () => {
    const qualityEvents = [
      { name: "upload_started", properties: { toolId: "merge-pdf" } },
      { name: "upload_validation_failed", properties: { toolId: "merge-pdf", errorCategory: "invalid_pdf" } },
      { name: "upload_started", properties: { toolId: "merge-pdf" } },
      { name: "export_started", properties: { toolId: "merge-pdf" } },
      { name: "export_started", properties: { toolId: "merge-pdf" } },
      { name: "export_succeeded", properties: { toolId: "merge-pdf", durationMs: 800 } },
      { name: "export_failed", properties: { toolId: "merge-pdf", deviceClass: "mobile" } },
      { name: "pdf_downloaded", properties: { toolId: "merge-pdf" } },
    ];
    expect(createToolQualityScorecard(qualityEvents, ["merge-pdf"])).toEqual([{
      toolId: "merge-pdf",
      uploads: 2,
      validationFailures: 1,
      attempts: 2,
      successes: 1,
      failures: 1,
      downloads: 1,
      successRate: 50,
      uploadToDownloadRate: 50,
      medianDurationMs: 800,
      p95DurationMs: 800,
      failedByDevice: { desktop: 0, mobile: 1, unknown: 0 },
    }]);
  });

  it("builds an ordered visitor-level Google search conversion funnel", () => {
    const funnelEvents = [
      { name: "page_viewed", visitorId: "complete", occurredAt: { toDate: () => new Date("2026-07-20T08:04:00.000Z") }, clientOccurredAt: "2026-07-20T08:00:00.000Z", properties: { trafficSource: "organic", referrerDomain: "google.com" } },
      { name: "upload_started", visitorId: "complete", clientOccurredAt: "2026-07-20T08:01:00.000Z", properties: {} },
      { name: "export_succeeded", visitorId: "complete", clientOccurredAt: "2026-07-20T08:02:00.000Z", properties: {} },
      { name: "account_signed_up", visitorId: "complete", clientOccurredAt: "2026-07-20T08:03:00.000Z", properties: {} },
      { name: "page_viewed", visitorId: "upload-only", clientOccurredAt: "2026-07-20T09:00:00.000Z", properties: { trafficSource: "organic", referrerDomain: "www.google.co.uk" } },
      { name: "upload_started", visitorId: "upload-only", clientOccurredAt: "2026-07-20T09:01:00.000Z", properties: {} },
      { name: "page_viewed", visitorId: "direct", clientOccurredAt: "2026-07-20T10:00:00.000Z", properties: { trafficSource: "direct", referrerDomain: "" } },
      { name: "account_signed_up", visitorId: "out-of-order", clientOccurredAt: "2026-07-20T07:00:00.000Z", properties: {} },
      { name: "page_viewed", visitorId: "out-of-order", clientOccurredAt: "2026-07-20T11:00:00.000Z", properties: { trafficSource: "organic", referrerDomain: "google.ca" } },
    ];
    expect(createGoogleSearchConversionFunnel(funnelEvents)).toEqual({
      googleVisitors: 3,
      uploads: 2,
      completedPdfs: 1,
      signups: 1,
      visitToUploadRate: 67,
      uploadToCompletionRate: 50,
      completionToSignupRate: 100,
      visitToSignupRate: 33,
    });
  });

  it("builds the product overview only from observed visitor journeys", () => {
    const outcomeEvents = [
      { name: "page_view", visitorId: "finished", clientOccurredAt: "2026-07-20T08:00:00.000Z", properties: {} },
      { name: "pdf_upload_completed", visitorId: "finished", clientOccurredAt: "2026-07-20T08:01:00.000Z", properties: { toolId: "merge-pdf" } },
      { name: "export_succeeded", visitorId: "finished", clientOccurredAt: "2026-07-20T08:02:00.000Z", properties: { toolId: "merge-pdf" } },
      { name: "page_view", visitorId: "used", clientOccurredAt: "2026-07-20T09:00:00.000Z", properties: {} },
      { name: "pdf_upload_completed", visitorId: "used", clientOccurredAt: "2026-07-20T09:01:00.000Z", properties: { toolId: "edit-pdf" } },
      { name: "editor_opened", visitorId: "used", clientOccurredAt: "2026-07-20T09:02:00.000Z", properties: { toolId: "edit-pdf" } },
      { name: "page_view", visitorId: "visit-only", clientOccurredAt: "2026-07-20T10:00:00.000Z", properties: {} },
      { name: "export_succeeded", visitorId: "out-of-order", clientOccurredAt: "2026-07-20T07:00:00.000Z", properties: { toolId: "compress-pdf" } },
      { name: "pdf_upload_completed", visitorId: "out-of-order", clientOccurredAt: "2026-07-20T11:00:00.000Z", properties: { toolId: "compress-pdf" } },
    ];

    expect(createOutcomeOverview(outcomeEvents)).toEqual({
      peopleReached: 4,
      uploaded: 3,
      usedTool: 2,
      finishedPdf: 1,
      journey: [
        { key: "visit", label: "Visit", value: 4, rate: 100 },
        { key: "upload", label: "Upload", value: 3, rate: 75 },
        { key: "use", label: "Use a tool", value: 2, rate: 50 },
        { key: "finish", label: "Finish", value: 1, rate: 25 },
      ],
    });
  });

  it("breaks acquisition into privacy-safe upload and finish journeys", () => {
    const acquisitionEvents = [
      { name: "page_view", visitorId: "organic-finish", clientOccurredAt: "2026-07-20T08:00:00.000Z", path: "/compress-pdf", trafficSource: "organic", deviceCategory: "mobile", properties: {} },
      { name: "pdf_upload_completed", visitorId: "organic-finish", clientOccurredAt: "2026-07-20T08:01:00.000Z", properties: { toolId: "compress-pdf" } },
      { name: "export_succeeded", visitorId: "organic-finish", clientOccurredAt: "2026-07-20T08:01:02.000Z", properties: { toolId: "compress-pdf", durationMs: 2_000 } },
      { name: "page_view", visitorId: "organic-visit", clientOccurredAt: "2026-07-20T09:00:00.000Z", path: "/compress-pdf", trafficSource: "organic", deviceCategory: "desktop", properties: {} },
      { name: "pdf_upload_failed", visitorId: "organic-visit", clientOccurredAt: "2026-07-20T09:01:00.000Z", properties: { toolId: "compress-pdf", errorCategory: "encrypted_pdf" } },
      { name: "page_view", visitorId: "direct-upload", clientOccurredAt: "2026-07-20T10:00:00.000Z", path: "/merge-pdf", trafficSource: "direct", deviceCategory: "desktop", properties: {} },
      { name: "pdf_upload_completed", visitorId: "direct-upload", clientOccurredAt: "2026-07-20T10:01:00.000Z", properties: { toolId: "merge-pdf" } },
    ];

    expect(createAcquisitionBreakdown(acquisitionEvents, "landingPage")).toEqual({
      dimension: "landingPage",
      rows: [
        { label: "/compress-pdf", people: 2, uploads: 1, finished: 1, visitToUploadRate: 50, uploadToFinishRate: 100 },
        { label: "/merge-pdf", people: 1, uploads: 1, finished: 0, visitToUploadRate: 100, uploadToFinishRate: 0 },
      ],
      failureCategories: [{ label: "encrypted_pdf", value: 1 }],
      durationBuckets: [{ label: "1–3 seconds", value: 1 }],
    });

    expect(createAcquisitionBreakdown(acquisitionEvents, "tool").rows).toEqual([
      { label: "compress-pdf", people: 2, uploads: 1, finished: 1, visitToUploadRate: 50, uploadToFinishRate: 100 },
      { label: "merge-pdf", people: 1, uploads: 1, finished: 0, visitToUploadRate: 100, uploadToFinishRate: 0 },
    ]);
  });

  it("ranks tools by real unique users and ignores events without a tool", () => {
    const usageEvents = [
      { name: "editor_opened", visitorId: "visitor-1", properties: { toolId: "edit-pdf" } },
      { name: "add_text_used", visitorId: "visitor-1", properties: { toolId: "edit-pdf" } },
      { name: "editor_opened", visitorId: "visitor-2", properties: { toolId: "edit-pdf" } },
      { name: "export_succeeded", visitorId: "visitor-3", properties: { toolId: "merge-pdf" } },
      { name: "page_view", visitorId: "visitor-4", properties: {} },
    ];

    expect(createToolUsage(usageEvents)).toEqual([
      { toolId: "edit-pdf", uses: 3, uniqueUsers: 2 },
      { toolId: "merge-pdf", uses: 1, uniqueUsers: 1 },
    ]);
    expect(createToolUsage([])).toEqual([]);
  });

  it("keeps the production scorecard aligned with the release-gate manifest", () => {
    expect(priorityOneToolCoverage.map(({ toolId }) => toolId)).toEqual(PRIORITY_ONE_TOOL_IDS);
  });
});

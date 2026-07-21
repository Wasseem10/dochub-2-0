import { collection, deleteDoc, doc, getCountFromServer, getDocs, limit, orderBy, query, updateDoc, where } from "firebase/firestore";
import Activity from "lucide-react/dist/esm/icons/activity.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import LogIn from "lucide-react/dist/esm/icons/log-in.mjs";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import UserPlus from "lucide-react/dist/esm/icons/user-plus.mjs";
import Users from "lucide-react/dist/esm/icons/users.mjs";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle.mjs";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2.mjs";
import Gauge from "lucide-react/dist/esm/icons/gauge.mjs";
import LifeBuoy from "lucide-react/dist/esm/icons/life-buoy.mjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { analyticsRangeStart, createDailyAnalyticsSeries, createToolQualityScorecard, filterAnalyticsEvents, groupAnalyticsProperty, summarizeAnalyticsEvents } from "../../analytics/analyticsMetrics.js";
import { db } from "../../firebase.js";
import "./owner-analytics.css";

const EVENT_LABELS = Object.freeze({
  account_signed_up: "Account created",
  account_logged_in: "Successful login",
  homepage_viewed: "Homepage viewed",
  page_viewed: "Public page viewed",
  upload_started: "PDF upload started",
  document_opened: "PDF opened",
  pdf_downloaded: "PDF downloaded",
  export_started: "Export started",
  export_succeeded: "Export completed",
  export_failed: "Export failed",
  client_error: "Browser error",
  unhandled_rejection: "Unhandled browser error",
  slow_operation: "Slow operation",
});

function formatEventTime(event) {
  const value = event.occurredAt?.toDate?.() || event.createdAt?.toDate?.() || event.clientOccurredAt || event.clientCreatedAt;
  if (!value) return "Just now";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function eventDetail(event) {
  if (event.properties?.authMethod) return event.properties.authMethod === "google" ? "Google" : "Email and password";
  if (event.properties?.toolId) return event.properties.toolId.replaceAll("-", " ");
  return event.actorId ? "Signed-in user" : "Anonymous visitor";
}

function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds)) return "—";
  return milliseconds < 1000 ? `${milliseconds} ms` : `${(milliseconds / 1000).toFixed(milliseconds < 10_000 ? 1 : 0)} s`;
}

export function OwnerAnalyticsPanel() {
  const [events, setEvents] = useState([]);
  const [range, setRange] = useState("30d");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [supportRequests, setSupportRequests] = useState([]);
  const [serverCounts, setServerCounts] = useState(null);

  const loadAnalytics = useCallback(async () => {
    if (!db) {
      setStatus("error");
      setMessage("Firebase analytics storage is not configured for this deployment.");
      return;
    }
    setStatus("loading");
    setMessage("");
    setServerCounts(null);
    try {
      const analyticsCollection = collection(db, "productAnalyticsEvents");
      const rangeStart = analyticsRangeStart(range);
      const eventQuery = rangeStart
        ? query(analyticsCollection, where("clientOccurredAt", ">=", rangeStart), orderBy("clientOccurredAt", "desc"), limit(5000))
        : query(analyticsCollection, orderBy("clientOccurredAt", "desc"), limit(5000));
      const supportQuery = query(collection(db, "supportRequests"), orderBy("clientCreatedAt", "desc"), limit(250));
      const countEvent = async (name, authMethod = null) => {
        const constraints = [where("name", "==", name)];
        if (authMethod) constraints.push(where("properties.authMethod", "==", authMethod));
        if (rangeStart) constraints.push(where("clientOccurredAt", ">=", rangeStart));
        const snapshot = await getCountFromServer(query(analyticsCollection, ...constraints));
        return snapshot.data().count;
      };
      const aggregateCounts = Promise.all([
        countEvent("account_signed_up"),
        countEvent("account_logged_in"),
        countEvent("account_signed_up", "google"),
        countEvent("account_logged_in", "google"),
        countEvent("document_opened"),
        countEvent("pdf_downloaded"),
        countEvent("client_error"),
        countEvent("unhandled_rejection"),
        countEvent("export_failed"),
        countEvent("slow_operation"),
        countEvent("page_viewed"),
      ]).catch(() => null);
      const [snapshot, supportSnapshot, countValues] = await Promise.all([
        getDocs(eventQuery),
        getDocs(supportQuery),
        aggregateCounts,
      ]);
      setEvents(snapshot.docs.map((eventDocument) => ({ id: eventDocument.id, ...eventDocument.data() })));
      setSupportRequests(supportSnapshot.docs.map((requestDocument) => ({ id: requestDocument.id, ...requestDocument.data() })));
      if (countValues) {
        const [signups, logins, googleSignups, googleLogins, uploads, downloads, clientErrors, unhandledRejections, failedExports, slowOperations, pageViews] = countValues;
        setServerCounts({
          signups,
          logins,
          googleAuth: googleSignups + googleLogins,
          uploads,
          downloads,
          clientErrors: clientErrors + unhandledRejections,
          failedExports,
          slowOperations,
          pageViews,
          conversionRate: uploads ? Math.round((downloads / uploads) * 100) : 0,
        });
      } else {
        setMessage("Scalable totals are waiting for the analytics indexes to finish deploying. Recent activity is shown below.");
      }
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error?.code === "permission-denied"
        ? "Analytics access is waiting for the owner-only Firestore rule to be deployed."
        : "FixThatPDF could not load analytics right now. Try refreshing in a moment.");
    }
  }, [range]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const filteredEvents = useMemo(() => filterAnalyticsEvents(events, range), [events, range]);
  const metrics = useMemo(() => summarizeAnalyticsEvents(filteredEvents), [filteredEvents]);
  const displayedMetrics = serverCounts ? { ...metrics, ...serverCounts } : metrics;
  const dailySeries = useMemo(() => createDailyAnalyticsSeries(filteredEvents, range === "7d" ? 7 : 14), [filteredEvents, range]);
  const maxDailyEvents = Math.max(1, ...dailySeries.map((day) => day.events));
  const recentEvents = filteredEvents.slice(0, 12);
  const trafficSources = useMemo(() => groupAnalyticsProperty(filteredEvents, "trafficSource"), [filteredEvents]);
  const landingPages = useMemo(() => groupAnalyticsProperty(filteredEvents, "landingPath"), [filteredEvents]);
  const toolQuality = useMemo(() => createToolQualityScorecard(filteredEvents), [filteredEvents]);
  const diagnosticEvents = filteredEvents.filter((event) => ["client_error", "unhandled_rejection", "slow_operation", "export_failed"].includes(event.name)).slice(0, 10);
  const updateSupportStatus = async (requestId, statusValue) => {
    await updateDoc(doc(db, "supportRequests", requestId), { status: statusValue });
    setSupportRequests((items) => items.map((item) => item.id === requestId ? { ...item, status: statusValue } : item));
  };
  const removeSupportRequest = async (requestId) => {
    await deleteDoc(doc(db, "supportRequests", requestId));
    setSupportRequests((items) => items.filter((item) => item.id !== requestId));
  };

  const cards = [
    { label: "New accounts", value: displayedMetrics.signups, detail: "Successful registrations", icon: UserPlus, tone: "coral" },
    { label: "Successful logins", value: displayedMetrics.logins, detail: "Email and Google logins", icon: LogIn, tone: "blue" },
    { label: "Google sign-ins", value: displayedMetrics.googleAuth, detail: "Google account authentications", icon: Users, tone: "coral" },
    { label: "Documents opened", value: displayedMetrics.uploads, detail: "PDFs opened in the editor", icon: FileText, tone: "blue" },
    { label: "PDFs downloaded", value: displayedMetrics.downloads, detail: `${displayedMetrics.conversionRate}% of opened documents`, icon: Download, tone: "green" },
    { label: "Recent active users", value: displayedMetrics.activeUsers, detail: "Unique users in the loaded activity feed", icon: Users, tone: "purple" },
    { label: "Organic page views", value: displayedMetrics.organicVisits, detail: `${displayedMetrics.organicRate}% of measured public page views`, icon: Gauge, tone: "green" },
  ];

  return (
    <section className="owner-analytics" aria-labelledby="analytics-title">
      <header className="owner-analytics-head">
        <div>
          <span>Owner-only</span>
          <h1 id="analytics-title">FixThatPDF analytics</h1>
          <p>Private product usage metrics. PDF names and document contents are never collected.</p>
        </div>
        <div className="owner-analytics-actions">
          <label>
            <span>Time period</span>
            <select value={range} onChange={(event) => setRange(event.target.value)}>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </label>
          <button type="button" onClick={loadAnalytics} disabled={status === "loading"}><RefreshCw size={16} /> Refresh</button>
        </div>
      </header>

      {message && <div className="owner-analytics-notice" role={status === "error" ? "alert" : "status"}>{message}</div>}
      {status === "loading" && !events.length && <div className="owner-analytics-loading">Loading private analytics…</div>}

      <div className="owner-analytics-cards">
        {cards.map(({ label, value, detail, icon: Icon, tone }) => (
          <article key={label}>
            <span className={`is-${tone}`}><Icon size={21} /></span>
            <small>{label}</small>
            <strong>{value.toLocaleString()}</strong>
            <p>{detail}</p>
          </article>
        ))}
      </div>

      <div className="owner-analytics-grid">
        <article className="owner-analytics-chart">
          <div className="owner-analytics-section-title">
            <div><h2>Daily activity</h2><p>All tracked product events</p></div>
            <strong><Activity size={16} /> {filteredEvents.length.toLocaleString()} recent events</strong>
          </div>
          <div className="owner-analytics-bars" aria-label="Daily analytics chart">
            {dailySeries.map((day) => (
              <div key={day.key} title={`${day.label}: ${day.events} events from ${day.users} users`}>
                <span><i style={{ height: `${Math.max(day.events ? 8 : 2, (day.events / maxDailyEvents) * 100)}%` }} /></span>
                <small>{day.label}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="owner-analytics-funnel">
          <div className="owner-analytics-section-title"><div><h2>PDF usage</h2><p>Upload-to-download funnel</p></div><Upload size={20} /></div>
          <dl>
            <div><dt>Completed uploads</dt><dd>{displayedMetrics.uploads.toLocaleString()}</dd></div>
            <div><dt>PDF downloads</dt><dd>{displayedMetrics.downloads.toLocaleString()}</dd></div>
            <div><dt>Download conversion</dt><dd>{displayedMetrics.conversionRate}%</dd></div>
          </dl>
        </article>
      </div>

      <div className="owner-acquisition-grid">
        <article className="owner-analytics-activity">
          <div className="owner-analytics-section-title"><div><h2>Traffic acquisition</h2><p>Privacy-safe first-touch source for this browser session</p></div><strong>{displayedMetrics.pageViews.toLocaleString()} page views</strong></div>
          <div className="owner-acquisition-list">{trafficSources.length ? trafficSources.map((item) => <div key={item.label}><span>{item.label.replaceAll("_", " ")}</span><strong>{item.value.toLocaleString()}</strong></div>) : <p>No public page views recorded yet.</p>}</div>
        </article>
        <article className="owner-analytics-activity">
          <div className="owner-analytics-section-title"><div><h2>Top landing pages</h2><p>The first public route visitors entered</p></div></div>
          <div className="owner-acquisition-list">{landingPages.length ? landingPages.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value.toLocaleString()}</strong></div>) : <p>No landing-page data recorded yet.</p>}</div>
        </article>
      </div>

      <article className="owner-analytics-activity owner-monitoring">
        <div className="owner-analytics-section-title"><div><h2>Production health</h2><p>Privacy-safe failures and slow operations</p></div><Gauge size={20} /></div>
        <div className="owner-monitoring-cards">
          <span><strong>{displayedMetrics.clientErrors.toLocaleString()}</strong><small>Browser errors</small></span>
          <span><strong>{displayedMetrics.failedExports.toLocaleString()}</strong><small>Failed exports</small></span>
          <span><strong>{displayedMetrics.slowOperations.toLocaleString()}</strong><small>Slow operations</small></span>
        </div>
        {diagnosticEvents.length ? <div className="owner-analytics-table">
          <div className="owner-analytics-row is-head"><span>Issue</span><span>Category</span><span>Route</span><span>Time</span></div>
          {diagnosticEvents.map((event) => <div className="owner-analytics-row" key={event.id}><strong><AlertTriangle size={14} /> {EVENT_LABELS[event.name]}</strong><span>{event.properties?.errorCategory || event.properties?.durationBucket || "unknown"}</span><span>{event.properties?.route || event.properties?.toolId || event.properties?.operation || "unknown"}</span><time>{formatEventTime(event)}</time></div>)}
        </div> : <div className="owner-analytics-empty"><CheckCircle2 size={24} /><strong>No production issues in this period</strong><p>New privacy-safe client errors and slow operations will appear here.</p></div>}
      </article>

      <article className="owner-analytics-activity owner-tool-quality">
        <div className="owner-analytics-section-title"><div><h2>Core tool quality</h2><p>Completion, download conversion, speed, and failures from anonymous production events</p></div><strong><Gauge size={16} /> Priority 1</strong></div>
        <div className="owner-quality-table" role="table" aria-label="Core tool quality scorecard">
          <div className="owner-quality-row is-head" role="row"><span>Tool</span><span>Uploads</span><span>Rejected</span><span>Attempts</span><span>Success</span><span>Downloads</span><span>Median</span><span>P95</span><span>Failures</span></div>
          {toolQuality.map((tool) => (
            <div className="owner-quality-row" role="row" key={tool.toolId}>
              <strong>{tool.toolId.replaceAll("-", " ")}</strong>
              <span>{tool.uploads.toLocaleString()}</span>
              <span>{tool.validationFailures.toLocaleString()}</span>
              <span>{tool.attempts.toLocaleString()}</span>
              <span className={tool.successRate === null ? "" : tool.successRate >= 95 ? "is-healthy" : "is-warning"}>{tool.successRate === null ? "—" : `${tool.successRate}%`}</span>
              <span>{tool.downloads.toLocaleString()}</span>
              <span>{formatDuration(tool.medianDurationMs)}</span>
              <span>{formatDuration(tool.p95DurationMs)}</span>
              <span>{tool.failures.toLocaleString()} <small>{tool.failedByDevice.mobile ? `(${tool.failedByDevice.mobile} mobile)` : ""}</small></span>
            </div>
          ))}
        </div>
      </article>

      <article className="owner-analytics-activity owner-support-inbox">
        <div className="owner-analytics-section-title"><div><h2>Support inbox</h2><p>Private requests sent from the public support form</p></div><strong><LifeBuoy size={16} /> {supportRequests.filter((item) => item.status === "new").length} new</strong></div>
        {supportRequests.length ? <div className="owner-support-list">{supportRequests.map((request) => <section key={request.id}><header><span className={`is-${request.status}`}>{request.status}</span><strong>{request.category.replaceAll("_", " ")}</strong><time>{formatEventTime(request)}</time></header><h3>{request.name} <a href={`mailto:${request.email}`}>{request.email}</a></h3><p>{request.message}</p><footer><button type="button" onClick={() => updateSupportStatus(request.id, request.status === "resolved" ? "new" : "resolved")}>{request.status === "resolved" ? "Reopen" : "Mark resolved"}</button><button type="button" onClick={() => removeSupportRequest(request.id)}>Delete</button></footer></section>)}</div> : <div className="owner-analytics-empty"><LifeBuoy size={24} /><strong>No support requests</strong><p>Messages from the public support page will appear here.</p></div>}
      </article>

      <article className="owner-analytics-activity">
        <div className="owner-analytics-section-title"><div><h2>Recent activity</h2><p>Latest privacy-safe events</p></div></div>
        {recentEvents.length ? (
          <div className="owner-analytics-table">
            <div className="owner-analytics-row is-head"><span>Event</span><span>Source</span><span>User</span><span>Time</span></div>
            {recentEvents.map((event) => (
              <div className="owner-analytics-row" key={event.id}>
                <strong>{EVENT_LABELS[event.name] || event.name.replaceAll("_", " ")}</strong>
                <span>{eventDetail(event)}</span>
                <span>{event.actorId ? "Signed in" : "Guest"}</span>
                <time>{formatEventTime(event)}</time>
              </div>
            ))}
          </div>
        ) : <div className="owner-analytics-empty"><Activity size={24} /><strong>No activity in this period</strong><p>Events will appear after people use this FixThatPDF release.</p></div>}
      </article>
    </section>
  );
}

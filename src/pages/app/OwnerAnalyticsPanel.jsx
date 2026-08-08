import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import Activity from "lucide-react/dist/esm/icons/activity.mjs";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days.mjs";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.mjs";
import CircleHelp from "lucide-react/dist/esm/icons/circle-help.mjs";
import FileCheck2 from "lucide-react/dist/esm/icons/file-check-2.mjs";
import LogIn from "lucide-react/dist/esm/icons/log-in.mjs";
import PencilLine from "lucide-react/dist/esm/icons/pencil-line.mjs";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.mjs";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import Users from "lucide-react/dist/esm/icons/users.mjs";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  canonicalAnalyticsEventName,
  createAuthenticationBreakdown,
  createFeatureUsage,
  createOutcomeOverview,
  createProductDailySeries,
  createToolUsage,
  groupTopLevelAnalyticsField,
} from "../../analytics/analyticsMetrics.js";
import { loadAdminAnalytics } from "../../analytics/analyticsApi.js";
import { isInternalTrafficDevice, setInternalTrafficDevice } from "../../analytics/productAnalytics.js";
import { db } from "../../firebase.js";
import { TOOL_BY_ID } from "../../tools/toolRegistry.js";
import "./owner-analytics.css";

const EVENT_LABELS = Object.freeze({
  page_view: "Viewed a page",
  pdf_upload_started: "Started a PDF upload",
  pdf_upload_completed: "Uploaded a PDF",
  pdf_upload_failed: "PDF upload failed",
  editor_opened: "Opened the editor",
  pdf_saved: "Saved a PDF",
  pdf_downloaded: "Downloaded a PDF",
  signup_started: "Started signup",
  signup_completed: "Created an account",
  login_completed: "Signed in",
  logout_completed: "Signed out",
  add_text_used: "Used Add Text",
  edit_text_used: "Edited PDF text",
  add_image_used: "Added an image",
  signature_used: "Added a signature",
  highlight_used: "Used Highlight",
  draw_used: "Used Draw",
  annotation_used: "Added an annotation",
  page_added: "Added a page",
  page_deleted: "Deleted a page",
  page_rotated: "Rotated a page",
  page_reordered: "Reordered pages",
  undo_used: "Used Undo",
  redo_used: "Used Redo",
  tool_opened: "Opened a PDF tool",
  export_started: "Started an export",
  export_succeeded: "Finished an export",
  export_failed: "Export failed",
  result_downloaded: "Downloaded a result",
});

const JOURNEY_ICONS = Object.freeze({ visit: Users, upload: Upload, use: PencilLine, finish: Check });

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function rangeDates(range, customStart, customEnd) {
  const now = new Date();
  const end = range === "custom" && customEnd ? new Date(`${customEnd}T23:59:59.999Z`) : now;
  const start = range === "custom" && customStart ? new Date(`${customStart}T00:00:00.000Z`) : new Date(now);
  if (range !== "custom") {
    start.setUTCHours(0, 0, 0, 0);
    if (range === "7d") start.setUTCDate(start.getUTCDate() - 6);
    if (range === "30d") start.setUTCDate(start.getUTCDate() - 29);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

function formatEventTime(event) {
  const value = event.clientOccurredAt || event.occurredAt;
  if (!value) return "Time unavailable";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

function formatSignInTime(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatMetric(value, unavailable) {
  return unavailable ? "—" : value.toLocaleString();
}

function ActivityChart({ series, unavailable }) {
  const chartId = useId().replaceAll(":", "");
  const width = 720;
  const height = 260;
  const padding = { top: 18, right: 12, bottom: 52, left: 48 };
  const values = series.map((day) => day.visitors);
  const maximum = Math.max(0, ...values);
  const x = (index) => padding.left + (series.length <= 1 ? 0 : (index / (series.length - 1)) * (width - padding.left - padding.right));
  const y = (value) => padding.top + (maximum ? (1 - value / maximum) : 1) * (height - padding.top - padding.bottom);
  const points = series.map((day, index) => `${x(index)},${y(day.visitors)}`).join(" ");
  const area = series.length ? `M ${x(0)} ${height - padding.bottom} L ${points.replaceAll(",", " ")} L ${x(series.length - 1)} ${height - padding.bottom} Z` : "";
  const guideValues = [maximum, Math.round(maximum / 2), 0];
  const labelStep = Math.max(1, Math.ceil(series.length / 7));
  const hasActivity = !unavailable && maximum > 0;

  return (
    <div className="owner-chart-wrap">
      <svg className="owner-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${chartId}-title ${chartId}-desc`}>
        <title id={`${chartId}-title`}>People reached by day</title>
        <desc id={`${chartId}-desc`}>{hasActivity ? series.map((day) => `${day.label}: ${day.visitors}`).join(", ") : "No recorded visitors in this date range."}</desc>
        {guideValues.map((value, index) => {
          const guideY = padding.top + (index / 2) * (height - padding.top - padding.bottom);
          return <g key={`${value}-${index}`}><line x1={padding.left} x2={width - padding.right} y1={guideY} y2={guideY} /><text x={padding.left - 12} y={guideY + 4}>{unavailable ? "—" : value}</text></g>;
        })}
        {hasActivity && <><defs><linearGradient id={`${chartId}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2f63f5" stopOpacity=".17" /><stop offset="1" stopColor="#2f63f5" stopOpacity="0" /></linearGradient></defs><path className="owner-chart-area" d={area} fill={`url(#${chartId}-fill)`} /><polyline className="owner-chart-line" points={points} />{series.map((day, index) => <circle key={day.key} cx={x(index)} cy={y(day.visitors)} r="4" />)}</>}
        {series.map((day, index) => (index % labelStep === 0 || index === series.length - 1) && <text className="owner-chart-label" key={day.key} x={x(index)} y={height - 20} textAnchor={index === 0 ? "start" : index === series.length - 1 ? "end" : "middle"}>{day.label}</text>)}
      </svg>
      {!hasActivity && <div className="owner-chart-empty">{unavailable ? "Activity is unavailable until analytics reloads." : "No people reached in this period."}</div>}
    </div>
  );
}

export function OwnerAnalyticsPanel({ searchQuery = "" }) {
  const today = isoDate(new Date());
  const weekAgo = new Date();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 6);
  const [range, setRange] = useState("7d");
  const [customStart, setCustomStart] = useState(isoDate(weekAgo));
  const [customEnd, setCustomEnd] = useState(today);
  const [includeInternal, setIncludeInternal] = useState(false);
  const [internalDevice, setInternalDevice] = useState(() => isInternalTrafficDevice());
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [featureSort, setFeatureSort] = useState("uses");
  const [signInProfiles, setSignInProfiles] = useState([]);
  const [identityMessage, setIdentityMessage] = useState("");

  const selectedDates = useMemo(() => rangeDates(range, customStart, customEnd), [customEnd, customStart, range]);
  const loadAnalytics = useCallback(async (signal) => {
    setStatus("loading");
    setMessage("");
    try {
      const payload = await loadAdminAnalytics({ ...selectedDates, includeInternal, signal });
      setEvents(payload.events || []);
      setTruncated(payload.truncated === true);
      setStatus("ready");
    } catch (error) {
      if (error?.name === "AbortError") return;
      setStatus("error");
      setMessage(error?.code === "analytics_forbidden"
        ? "This account does not have permission to view PDFEnrich analytics."
        : "Product analytics could not be loaded. Check the analytics service and try again.");
    }
  }, [includeInternal, selectedDates]);

  useEffect(() => {
    const controller = new AbortController();
    void loadAnalytics(controller.signal);
    return () => controller.abort();
  }, [loadAnalytics]);

  useEffect(() => {
    if (!db) return;
    getDocs(query(collection(db, "authUserProfiles"), orderBy("lastSignInAt", "desc"), limit(250)))
      .then((snapshot) => {
        setSignInProfiles(snapshot.docs.map((profile) => ({ id: profile.id, ...profile.data() })));
        setIdentityMessage("");
      })
      .catch(() => setIdentityMessage("The owner-only sign-in directory is not available in this environment."));
  }, []);

  const overview = useMemo(() => createOutcomeOverview(events), [events]);
  const topTools = useMemo(() => createToolUsage(events), [events]);
  const featureUsage = useMemo(() => createFeatureUsage(events, featureSort), [events, featureSort]);
  const authentication = useMemo(() => createAuthenticationBreakdown(events), [events]);
  const trafficSources = useMemo(() => groupTopLevelAnalyticsField(events, "trafficSource"), [events]);
  const devices = useMemo(() => groupTopLevelAnalyticsField(events, "deviceCategory", { eventName: null, limit: 4 }), [events]);
  const dailySeries = useMemo(() => createProductDailySeries(events, selectedDates.start, selectedDates.end), [events, selectedDates]);
  const recentEvents = events.slice(0, 30);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleProfiles = signInProfiles.filter((profile) => !normalizedSearch || [profile.displayName, profile.email, profile.provider].some((value) => String(value || "").toLowerCase().includes(normalizedSearch)));
  const unavailable = status === "error" && events.length === 0;
  const isLoadingFirstPage = status === "loading" && events.length === 0;
  const rangeLabel = range === "today" ? "Today" : range === "7d" ? "Last 7 days" : range === "30d" ? "Last 30 days" : "Custom range";
  const metricRows = [
    { label: "People reached", value: overview.peopleReached, detail: "Visited PDFEnrich", help: "Distinct privacy-safe visitor IDs recorded during this period." },
    { label: "Used a PDF tool", value: overview.usedTool, detail: "Reached a tool after upload", help: "Distinct people whose recorded journey included an upload followed by tool activity." },
    { label: "Finished a PDF", value: overview.finishedPdf, detail: "Completed or downloaded", help: "Distinct people whose recorded journey reached a successful export or download." },
  ];
  const setDeviceExclusion = (excluded) => setInternalDevice(setInternalTrafficDevice(excluded));

  return (
    <section className="owner-analytics" aria-labelledby="analytics-title" aria-busy={status === "loading"}>
      <header className="owner-analytics-head">
        <div>
          <h1 id="analytics-title">Product overview</h1>
          <p>See how people discover PDFEnrich, use the tools, and complete their PDF work.</p>
        </div>
        <div className="owner-analytics-actions">
          <label className="owner-range-select"><CalendarDays size={17} /><span className="sr-only">Date range</span><select value={range} aria-label="Date range" onChange={(event) => setRange(event.target.value)}><option value="today">Today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="custom">Custom range</option></select><ChevronDown size={15} aria-hidden="true" /></label>
          <button type="button" onClick={() => loadAnalytics()} disabled={status === "loading"}><RefreshCw size={16} /> Refresh</button>
        </div>
      </header>

      {range === "custom" && <div className="owner-analytics-custom-range"><label><span>Start date (UTC)</span><input type="date" value={customStart} max={customEnd} onChange={(event) => setCustomStart(event.target.value)} /></label><label><span>End date (UTC)</span><input type="date" value={customEnd} min={customStart} max={today} onChange={(event) => setCustomEnd(event.target.value)} /></label></div>}
      {message && <div className="owner-analytics-notice is-error" role="alert"><span>{message}</span><button type="button" onClick={() => loadAnalytics()}>Try again</button></div>}
      {truncated && <div className="owner-analytics-notice" role="status">This period exceeded the 25,000-event window. Choose a shorter date range for exact totals.</div>}
      {isLoadingFirstPage && <div className="owner-analytics-loading"><span /> Loading product activity…</div>}

      <div className="owner-summary-grid" aria-label={`${rangeLabel} summary`}>
        {metricRows.map((metric) => <article key={metric.label}><div><h2>{metric.label}</h2><CircleHelp size={16} aria-label={metric.help} title={metric.help} /></div><strong>{formatMetric(metric.value, unavailable)}</strong><p>{unavailable ? "Unavailable" : metric.detail}</p></article>)}
      </div>

      <ol className="owner-journey" aria-label="PDF completion journey">
        {overview.journey.map((stage, index) => {
          const Icon = JOURNEY_ICONS[stage.key];
          return <li key={stage.key}><span className="owner-journey-icon"><Icon size={25} /></span><div><small>{stage.label}</small><strong>{formatMetric(stage.value, unavailable)}</strong><p>{unavailable ? "Unavailable" : `${stage.rate}% of people`}</p></div>{index < overview.journey.length - 1 && <span className="owner-journey-arrow" aria-hidden="true">→</span>}</li>;
        })}
      </ol>

      <div className="owner-primary-grid">
        <article className="owner-activity-panel"><div className="owner-section-heading"><h2>{range === "7d" ? "7-day activity" : `${rangeLabel} activity`}</h2><span><i /> People reached</span></div><ActivityChart series={dailySeries} unavailable={unavailable} /></article>
        <article className="owner-tools-panel"><div className="owner-section-heading"><h2>Most-used tools</h2></div>{topTools.length ? <ol>{topTools.map((tool, index) => <li key={tool.toolId}><span>{index + 1}</span><strong>{TOOL_BY_ID.get(tool.toolId)?.name || tool.toolId.replaceAll("-", " ")}</strong><em>{tool.uniqueUsers.toLocaleString()} {tool.uniqueUsers === 1 ? "person" : "people"}</em></li>)}</ol> : <div className="owner-tools-empty"><Activity size={22} /><strong>{unavailable ? "Tool use unavailable" : "No tool use recorded"}</strong><p>{unavailable ? "Reload analytics to see tool activity." : "Tools appear after a consented visitor uses them."}</p></div>}</article>
      </div>

      <details className="owner-more-details">
        <summary><strong>More details</strong><span>View accounts, devices, traffic sources, and event history.</span><ChevronDown size={18} /></summary>
        <div className="owner-detail-content">
          <section className="owner-detail-section owner-traffic-controls"><div className="owner-detail-heading"><div><h2>Analytics controls</h2><p>Internal traffic is excluded by default.</p></div><ShieldCheck size={19} /></div><div className="owner-control-row"><div><strong>{internalDevice ? "This device is excluded" : "This device is counted"}</strong><small>Only the internal flag is stored with eligible events.</small></div><button type="button" onClick={() => setDeviceExclusion(!internalDevice)}>{internalDevice ? "Count this device" : "Exclude this device"}</button><label><input type="checkbox" checked={includeInternal} onChange={(event) => setIncludeInternal(event.target.checked)} /> Include internal traffic</label></div></section>

          <div className="owner-detail-grid">
            <section className="owner-detail-section"><div className="owner-detail-heading"><div><h2>Traffic sources</h2><p>Safe source categories from page views</p></div></div><div className="owner-compact-list">{trafficSources.length ? trafficSources.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value.toLocaleString()}</strong></div>) : <p>No source data in this period.</p>}</div></section>
            <section className="owner-detail-section"><div className="owner-detail-heading"><div><h2>Devices</h2><p>Responsive viewport categories</p></div></div><div className="owner-compact-list">{devices.length ? devices.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value.toLocaleString()}</strong></div>) : <p>No device data in this period.</p>}</div></section>
            <section className="owner-detail-section"><div className="owner-detail-heading"><div><h2>Finished PDFs</h2><p>Anonymous and signed-in events</p></div></div><div className="owner-auth-split"><span style={{ width: `${authentication.anonymousRate}%` }} /><i style={{ width: `${authentication.signedInRate}%` }} /></div><div className="owner-compact-list"><div><span>Anonymous</span><strong>{authentication.anonymous.toLocaleString()}</strong></div><div><span>Signed in</span><strong>{authentication.signedIn.toLocaleString()}</strong></div></div></section>
          </div>

          <section className="owner-detail-section"><div className="owner-detail-heading"><div><h2>Editor feature use</h2><p>Completed actions, not pointer movement or tool selection</p></div><div className="owner-sort-actions"><button type="button" className={featureSort === "uses" ? "is-active" : ""} onClick={() => setFeatureSort("uses")}>Uses</button><button type="button" className={featureSort === "uniqueUsers" ? "is-active" : ""} onClick={() => setFeatureSort("uniqueUsers")}>People</button></div></div>{featureUsage.length ? <div className="owner-data-table owner-feature-table"><div className="is-head"><span>Feature</span><span>Uses</span><span>People</span></div>{featureUsage.map((feature) => <div key={feature.eventName}><strong>{feature.label}</strong><span>{feature.uses.toLocaleString()}</span><span>{feature.uniqueUsers.toLocaleString()}</span></div>)}</div> : <div className="owner-detail-empty"><FileCheck2 size={22} /><strong>No editor feature use in this period</strong></div>}</section>

          <section className="owner-detail-section"><div className="owner-detail-heading"><div><h2>Recent activity</h2><p>Privacy-safe product events only</p></div><strong>{events.length.toLocaleString()} events loaded</strong></div>{recentEvents.length ? <div className="owner-data-table owner-event-table"><div className="is-head"><span>Time</span><span>Visitor</span><span>Action</span><span>Context</span></div>{recentEvents.map((event, index) => { const canonicalName = canonicalAnalyticsEventName(event.name); return <div key={event.id || `${canonicalName}-${index}`}><time>{formatEventTime(event)}</time><span>{event.actorId ? "Signed in" : "Anonymous"}{event.internalTraffic ? " · Internal" : ""}</span><strong>{EVENT_LABELS[canonicalName] || canonicalName.replaceAll("_", " ")}</strong><span>{event.properties?.featureId || event.properties?.toolId || event.path || "Product"}</span></div>; })}</div> : <div className="owner-detail-empty"><Activity size={22} /><strong>No activity in this period</strong></div>}</section>

          <section className="owner-detail-section"><div className="owner-detail-heading"><div><h2>Sign-in directory</h2><p>Firebase identity records, kept separate from anonymous analytics</p></div><strong>{visibleProfiles.length.toLocaleString()} accounts</strong></div>{identityMessage && <div className="owner-identity-notice" role="status">{identityMessage}</div>}{visibleProfiles.length ? <div className="owner-data-table owner-account-table" role="table" aria-label="Sign-in directory"><div className="is-head" role="row"><span>Name</span><span>Email</span><span>Method</span><span>Last sign-in (UTC)</span></div>{visibleProfiles.map((profile) => <div role="row" key={profile.id}><strong>{profile.displayName || "PDFEnrich user"}</strong><a href={`mailto:${profile.email}`}>{profile.email}</a><span>{profile.provider === "google" ? "Google" : "Email and password"}</span><time>{formatSignInTime(profile.lastSignInAt)}</time></div>)}</div> : <div className="owner-detail-empty"><LogIn size={22} /><strong>No matching sign-ins</strong></div>}</section>
        </div>
      </details>
    </section>
  );
}

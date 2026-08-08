import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import Activity from "lucide-react/dist/esm/icons/activity.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import FileCheck2 from "lucide-react/dist/esm/icons/file-check-2.mjs";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import LogIn from "lucide-react/dist/esm/icons/log-in.mjs";
import MousePointer2 from "lucide-react/dist/esm/icons/mouse-pointer-2.mjs";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.mjs";
import Save from "lucide-react/dist/esm/icons/save.mjs";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import UserPlus from "lucide-react/dist/esm/icons/user-plus.mjs";
import Users from "lucide-react/dist/esm/icons/users.mjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  canonicalAnalyticsEventName,
  createAuthenticationBreakdown,
  createFeatureUsage,
  createPrivateAnalyticsSummary,
  createProductDailySeries,
  groupTopLevelAnalyticsField,
} from "../../analytics/analyticsMetrics.js";
import { loadAdminAnalytics } from "../../analytics/analyticsApi.js";
import { isInternalTrafficDevice, setInternalTrafficDevice } from "../../analytics/productAnalytics.js";
import { db } from "../../firebase.js";
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
});

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function rangeDates(range, customStart, customEnd) {
  const now = new Date();
  const end = range === "custom" && customEnd
    ? new Date(`${customEnd}T23:59:59.999Z`)
    : now;
  let start;
  if (range === "custom" && customStart) start = new Date(`${customStart}T00:00:00.000Z`);
  else {
    start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    if (range === "7d") start.setUTCDate(start.getUTCDate() - 6);
    if (range === "30d") start.setUTCDate(start.getUTCDate() - 29);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

function formatEventTime(event) {
  const value = event.clientOccurredAt || event.occurredAt;
  if (!value) return "Just now";
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

function metricCard(label, value, detail, icon) {
  return { label, value, detail, icon };
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
  const [chartMetric, setChartMetric] = useState("visitors");
  const [signInProfiles, setSignInProfiles] = useState([]);
  const [identityMessage, setIdentityMessage] = useState("");

  const selectedDates = useMemo(
    () => rangeDates(range, customStart, customEnd),
    [customEnd, customStart, range],
  );

  const loadAnalytics = useCallback(async (signal) => {
    setStatus("loading");
    setMessage("");
    try {
      const payload = await loadAdminAnalytics({
        ...selectedDates,
        includeInternal,
        signal,
      });
      setEvents(payload.events || []);
      setTruncated(payload.truncated === true);
      setStatus("ready");
    } catch (error) {
      if (error?.name === "AbortError") return;
      setStatus("error");
      setMessage(error?.code === "analytics_forbidden"
        ? "This Firebase account does not have the PDFEnrich analytics claim."
        : "Private product analytics could not be loaded. Verify the analytics API deployment and try again.");
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

  const summary = useMemo(() => createPrivateAnalyticsSummary(events), [events]);
  const featureUsage = useMemo(() => createFeatureUsage(events, featureSort), [events, featureSort]);
  const authentication = useMemo(() => createAuthenticationBreakdown(events), [events]);
  const trafficSources = useMemo(() => groupTopLevelAnalyticsField(events, "trafficSource"), [events]);
  const devices = useMemo(() => groupTopLevelAnalyticsField(events, "deviceCategory", { eventName: null, limit: 4 }), [events]);
  const dailySeries = useMemo(
    () => createProductDailySeries(events, selectedDates.start, selectedDates.end),
    [events, selectedDates],
  );
  const chartMaximum = Math.max(1, ...dailySeries.map((day) => day[chartMetric]));
  const recentEvents = events.slice(0, 30);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleProfiles = signInProfiles.filter((profile) => !normalizedSearch || [
    profile.displayName,
    profile.email,
    profile.provider,
  ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch)));
  const cards = [
    metricCard("Unique Visitors", summary.metrics.uniqueVisitors, "Random browser visitor IDs", Users),
    metricCard("Page Views", summary.metrics.pageViews, "Consented page views", MousePointer2),
    metricCard("PDF Uploads", summary.metrics.uploads, "Successfully loaded PDFs", Upload),
    metricCard("Editor Opens", summary.metrics.editorOpens, "Documents opened in editor", FileText),
    metricCard("PDF Saves", summary.metrics.saves, "Confirmed editor saves", Save),
    metricCard("PDF Downloads", summary.metrics.downloads, "Finished PDF downloads", Download),
    metricCard("New Accounts", summary.metrics.accounts, "Completed registrations", UserPlus),
  ];

  const setDeviceExclusion = (excluded) => {
    const next = setInternalTrafficDevice(excluded);
    setInternalDevice(next);
  };

  return (
    <section className="owner-analytics" aria-labelledby="analytics-title">
      <header className="owner-analytics-head">
        <div>
          <span>Private owner analytics</span>
          <h2 id="analytics-title">Are people reaching a finished PDF?</h2>
          <p>Anonymous and signed-in product journeys, without filenames, PDF text, signatures, form values, or document URLs.</p>
        </div>
        <div className="owner-analytics-actions">
          <label>
            <span>Date range</span>
            <select value={range} onChange={(event) => setRange(event.target.value)}>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <button type="button" onClick={() => loadAnalytics()} disabled={status === "loading"}><RefreshCw size={16} /> Refresh</button>
        </div>
      </header>

      {range === "custom" && (
        <div className="owner-analytics-custom-range">
          <label><span>Start (UTC)</span><input type="date" value={customStart} max={customEnd} onChange={(event) => setCustomStart(event.target.value)} /></label>
          <label><span>End (UTC)</span><input type="date" value={customEnd} min={customStart} max={today} onChange={(event) => setCustomEnd(event.target.value)} /></label>
        </div>
      )}

      <div className="owner-analytics-traffic-controls">
        <div><ShieldCheck size={18} /><span><strong>{internalDevice ? "This device is excluded" : "This device is counted normally"}</strong><small>Internal events are stored with a flag and excluded from the dashboard by default.</small></span></div>
        <button type="button" onClick={() => setDeviceExclusion(!internalDevice)}>{internalDevice ? "Stop excluding this device" : "Exclude this device from analytics"}</button>
        <label><input type="checkbox" checked={includeInternal} onChange={(event) => setIncludeInternal(event.target.checked)} /> Include internal traffic</label>
      </div>

      {message && <div className="owner-analytics-notice" role="alert">{message}</div>}
      {truncated && <div className="owner-analytics-notice" role="status">This range exceeded the 25,000-event query window. Narrow the dates for exact detail.</div>}
      {status === "loading" && !events.length && <div className="owner-analytics-loading">Loading private analytics…</div>}

      <div className="owner-analytics-cards is-seven">
        {cards.map(({ label, value, detail, icon: Icon }) => (
          <article key={label}><span><Icon size={19} /></span><small>{label}</small><strong>{value.toLocaleString()}</strong><p>{detail}</p></article>
        ))}
      </div>

      <article className="owner-analytics-conversions">
        {[
          ["Visitor → PDF Upload", summary.conversions.visitorToUpload],
          ["PDF Upload → Editor Open", summary.conversions.uploadToEditor],
          ["Editor Open → Download", summary.conversions.editorToDownload],
          ["Visitor → Signup", summary.conversions.visitorToSignup],
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}%</strong></div>)}
      </article>

      <div className="owner-analytics-grid">
        <article className="owner-analytics-activity">
          <div className="owner-analytics-section-title"><div><h2>Product Usage</h2><p>Distinct people who performed a meaningful product action</p></div><Activity size={20} /></div>
          <div className="owner-product-usage">
            {[
              ["Uploaded a PDF", summary.productUsage.uploadVisitors],
              ["Opened the editor", summary.productUsage.editorVisitors],
              ["Used an editor feature", summary.productUsage.featureVisitors],
              ["Downloaded a PDF", summary.productUsage.downloadVisitors],
            ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value.toLocaleString()}</strong></div>)}
          </div>
        </article>

        <article className="owner-analytics-activity owner-auth-breakdown">
          <div className="owner-analytics-section-title"><div><h2>Anonymous vs Signed-In</h2><p>Who completed PDF downloads</p></div><LogIn size={20} /></div>
          <div className="owner-auth-split"><span style={{ width: `${authentication.anonymousRate}%` }} /><i style={{ width: `${authentication.signedInRate}%` }} /></div>
          <dl><div><dt>Anonymous</dt><dd>{authentication.anonymousRate}% <small>{authentication.anonymous}</small></dd></div><div><dt>Signed in</dt><dd>{authentication.signedInRate}% <small>{authentication.signedIn}</small></dd></div></dl>
        </article>
      </div>

      <article className="owner-analytics-activity owner-feature-usage">
        <div className="owner-analytics-section-title">
          <div><h2>Feature Usage</h2><p>Completed editor actions—not tool selections or pointer movement</p></div>
          <div className="owner-sort-actions"><button type="button" className={featureSort === "uses" ? "is-active" : ""} onClick={() => setFeatureSort("uses")}>Sort by uses</button><button type="button" className={featureSort === "uniqueUsers" ? "is-active" : ""} onClick={() => setFeatureSort("uniqueUsers")}>Sort by users</button></div>
        </div>
        {featureUsage.length ? <div className="owner-feature-table"><div className="is-head"><span>Feature</span><span>Uses</span><span>Unique Users</span></div>{featureUsage.map((feature) => <div key={feature.eventName}><strong>{feature.label}</strong><span>{feature.uses.toLocaleString()}</span><span>{feature.uniqueUsers.toLocaleString()}</span></div>)}</div> : <div className="owner-analytics-empty"><FileCheck2 size={24} /><strong>No editor features used in this range</strong><p>Successful feature actions will appear here.</p></div>}
      </article>

      <article className="owner-analytics-activity owner-product-funnel">
        <div className="owner-analytics-section-title"><div><h2>Conversion Funnel</h2><p>Unique visitors reaching each step in order</p></div></div>
        <ol>{summary.funnel.map((stage, index) => <li key={stage.key}><small>0{index + 1}</small><span>{stage.label}</span><strong>{stage.value.toLocaleString()}</strong>{index > 0 && <em>{stage.fromPreviousRate}% from previous</em>}</li>)}</ol>
      </article>

      <article className="owner-analytics-activity owner-timeseries">
        <div className="owner-analytics-section-title"><div><h2>Daily Activity</h2><p>UTC calendar days</p></div><select value={chartMetric} onChange={(event) => setChartMetric(event.target.value)}><option value="visitors">Unique Visitors</option><option value="uploads">PDF Uploads</option><option value="downloads">PDF Downloads</option></select></div>
        <div className="owner-timeseries-bars">{dailySeries.map((day) => <div key={day.key} title={`${day.label}: ${day[chartMetric]}`}><span><i style={{ height: `${Math.max(day[chartMetric] ? 6 : 1, (day[chartMetric] / chartMaximum) * 100)}%` }} /></span><small>{day.label}</small></div>)}</div>
      </article>

      <div className="owner-acquisition-grid">
        <article className="owner-analytics-activity"><div className="owner-analytics-section-title"><div><h2>Traffic Sources</h2><p>Referrer category or safe UTM campaign</p></div></div><div className="owner-acquisition-list">{trafficSources.length ? trafficSources.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value.toLocaleString()}</strong></div>) : <p>No referrer data in this range.</p>}</div></article>
        <article className="owner-analytics-activity"><div className="owner-analytics-section-title"><div><h2>Devices</h2><p>Responsive viewport category—no fingerprinting</p></div></div><div className="owner-acquisition-list">{devices.length ? devices.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value.toLocaleString()}</strong></div>) : <p>No device data in this range.</p>}</div></article>
      </div>

      <article className="owner-analytics-activity">
        <div className="owner-analytics-section-title"><div><h2>Recent Activity</h2><p>Safe anonymized product events</p></div><strong>{events.length.toLocaleString()} events loaded</strong></div>
        {recentEvents.length ? <div className="owner-analytics-table"><div className="owner-analytics-row is-head"><span>Time</span><span>Visitor</span><span>Action</span><span>Context</span></div>{recentEvents.map((event) => { const canonicalName = canonicalAnalyticsEventName(event.name); return <div className="owner-analytics-row" key={event.id}><time>{formatEventTime(event)}</time><span>{event.actorId ? "Signed-in user" : "Anonymous visitor"}{event.internalTraffic ? " · Internal" : ""}</span><strong>{EVENT_LABELS[canonicalName] || canonicalName.replaceAll("_", " ")}</strong><span>{event.properties?.featureId || event.properties?.toolId || event.path || "Product"}</span></div>; })}</div> : <div className="owner-analytics-empty"><Activity size={24} /><strong>No activity in this range</strong><p>Events appear after a visitor allows optional analytics and uses PDFEnrich.</p></div>}
      </article>

      <article className="owner-analytics-activity owner-auth-ledger">
        <div className="owner-analytics-section-title"><div><h2>Sign-in Directory</h2><p>Owner-only Firebase account ledger; identity data is separate from anonymous events</p></div><strong>{visibleProfiles.length.toLocaleString()} accounts</strong></div>
        {identityMessage && <div className="owner-identity-notice" role="status">{identityMessage}</div>}
        {visibleProfiles.length ? <div className="owner-auth-table" role="table" aria-label="Sign-in directory"><div className="owner-auth-row is-head" role="row"><span>Name</span><span>Email</span><span>Method</span><span>Last sign-in (UTC)</span></div>{visibleProfiles.map((profile) => <div className="owner-auth-row" role="row" key={profile.id}><strong>{profile.displayName || "PDFEnrich user"}</strong><a href={`mailto:${profile.email}`}>{profile.email}</a><span>{profile.provider === "google" ? "Google" : "Email and password"}</span><time>{formatSignInTime(profile.lastSignInAt)}</time></div>)}</div> : <div className="owner-analytics-empty"><LogIn size={24} /><strong>No matching sign-ins</strong><p>Signed-in accounts appear after Firebase records their next login.</p></div>}
      </article>
    </section>
  );
}

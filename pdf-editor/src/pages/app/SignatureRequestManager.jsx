import { useEffect, useState } from "react";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2.mjs";
import Clock3 from "lucide-react/dist/esm/icons/clock-3.mjs";
import Copy from "lucide-react/dist/esm/icons/copy.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import FileSignature from "lucide-react/dist/esm/icons/file-signature.mjs";
import Mail from "lucide-react/dist/esm/icons/mail.mjs";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.mjs";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.mjs";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.mjs";
import XCircle from "lucide-react/dist/esm/icons/x-circle.mjs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db, storage } from "../../firebase.js";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import {
  createSignatureInvitationUrl,
  deleteCloudSignatureRequest,
  downloadSignatureRequestPdf,
  getOwnedSignatureRequest,
  listOwnedSignatureRequests,
  recordSignatureReminder,
  revokeCloudSignatureRequest,
} from "../../signing/signatureRequestStore.js";

function asDate(value) {
  return value?.toDate?.() || (value ? new Date(value) : null);
}

function formatDate(value, includeTime = false) {
  const date = asDate(value);
  if (!date || !Number.isFinite(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en", includeTime
    ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function createAuditTrail(request) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]);
  let y = 730;
  const write = (text, options = {}) => {
    if (y < 70) { page = pdf.addPage([612, 792]); y = 730; }
    page.drawText(String(text || ""), { x: options.x || 54, y, size: options.size || 10, font: options.bold ? bold : regular, color: options.color || rgb(0.06, 0.1, 0.2), maxWidth: options.maxWidth || 504 });
    y -= options.gap || 19;
  };
  write("FixThatPDF signing activity record", { size: 22, bold: true, gap: 30 });
  write("Account-attributed activity and document fingerprints — not a certified digital signature", { size: 9, color: rgb(0.35, 0.4, 0.48), gap: 28 });
  write(`Document: ${request.fileName}`, { bold: true });
  write(`Request ID: ${request.id}`);
  write(`Owner: ${request.ownerName || request.ownerEmail} <${request.ownerEmail}>`);
  write(`Created: ${formatDate(request.createdAt, true)}`);
  write(`Expires: ${formatDate(request.expiresAt, true)}`);
  write(`Status: ${request.status}`);
  write(`Original SHA-256: ${request.sourceFingerprint}`, { size: 8, gap: 16 });
  write(`Current SHA-256: ${request.currentFingerprint}`, { size: 8, gap: 28 });
  request.recipients.forEach((recipient, index) => {
    write(`${index + 1}. ${recipient.name} <${recipient.email}>`, { bold: true });
    write(`Status: ${recipient.status} · Required fields: ${recipient.fields?.length || 0}`);
    if (recipient.authenticatedEmail) write(`Authenticated Google email: ${recipient.authenticatedEmail}`);
    if (recipient.consentedAt) write(`Electronic signature consent: accepted ${formatDate(recipient.consentedAt, true)} (${recipient.consentVersion || "recorded"})`);
    if (recipient.signedAt) write(`Completed: ${formatDate(recipient.signedAt, true)}`);
    if (recipient.sourceFingerprint) write(`Input SHA-256: ${recipient.sourceFingerprint}`, { size: 8, gap: 15 });
    if (recipient.outputFingerprint) write(`Output SHA-256: ${recipient.outputFingerprint}`, { size: 8, gap: 15 });
    if (recipient.reminderCount) write(`Manual reminder drafts opened: ${recipient.reminderCount}`);
    y -= 10;
  });
  pdf.setTitle(`Signing activity record for ${request.fileName}`);
  pdf.setCreator("FixThatPDF");
  return new Blob([await pdf.save()], { type: "application/pdf" });
}

function displayedStatus(record) {
  return record?.status === "active" && asDate(record.expiresAt)?.getTime() <= Date.now() ? "expired" : record?.status;
}

function StatusBadge({ status, expiresAt }) {
  status = displayedStatus({ status, expiresAt });
  const label = status === "completed" ? "Completed" : status === "active" ? "In progress" : status === "waiting" ? "Waiting" : status === "revoked" ? "Revoked" : "Preparing";
  const visibleLabel = status === "expired" ? "Expired" : label;
  return <span className={`signature-status is-${status}`}>{visibleLabel}</span>;
}

export function SignatureRequestManager({ currentUser, onCreateRequest }) {
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");

  const refresh = async (preferredId = selected?.id) => {
    if (!currentUser?.uid) return;
    setLoading(true); setMessage("");
    try {
      const nextRequests = await listOwnedSignatureRequests({ db, userId: currentUser.uid });
      setRequests(nextRequests);
      const requestId = preferredId && nextRequests.some((item) => item.id === preferredId) ? preferredId : nextRequests[0]?.id;
      setSelected(requestId ? await getOwnedSignatureRequest({ db, userId: currentUser.uid, requestId }) : null);
    } catch (error) {
      setMessage(error.message || "Signature requests could not be loaded.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void refresh(""); }, [currentUser?.uid]);

  const selectRequest = async (requestId) => {
    setBusyAction(`select-${requestId}`); setMessage("");
    try { setSelected(await getOwnedSignatureRequest({ db, userId: currentUser.uid, requestId })); }
    catch (error) { setMessage(error.message || "The request could not be opened."); }
    finally { setBusyAction(""); }
  };

  const copyInvitation = async (recipient) => {
    const url = createSignatureInvitationUrl({ origin: window.location.origin, requestId: selected.id, inviteId: recipient.id });
    await navigator.clipboard.writeText(url);
    setCopied(recipient.id);
    window.setTimeout(() => setCopied(""), 1500);
  };

  const sendReminder = async (recipient) => {
    setBusyAction(`remind-${recipient.id}`); setMessage("");
    try {
      await recordSignatureReminder({ db, userId: currentUser.uid, requestId: selected.id, inviteId: recipient.id });
      const url = createSignatureInvitationUrl({ origin: window.location.origin, requestId: selected.id, inviteId: recipient.id });
      const subject = encodeURIComponent(`Reminder: signature requested for ${selected.fileName}`);
      const body = encodeURIComponent(`Please complete your signing step for ${selected.fileName}.\n\nOpen the secure link with ${recipient.email}:\n${url}\n\nThe request expires ${formatDate(selected.expiresAt, true)}.`);
      await refresh(selected.id);
      window.location.href = `mailto:${encodeURIComponent(recipient.email)}?subject=${subject}&body=${body}`;
    } catch (error) { setMessage(error.message || "The reminder draft could not be prepared."); }
    finally { setBusyAction(""); }
  };

  const downloadCurrentPdf = async () => {
    setBusyAction("download"); setMessage("");
    try {
      const result = await downloadSignatureRequestPdf({ db, storage, userId: currentUser.uid, requestId: selected.id });
      const suffix = selected.status === "completed" ? "signed" : "current";
      downloadBlob(result.blob, `${selected.fileName.replace(/\.pdf$/i, "")}-${suffix}.pdf`);
    } catch (error) { setMessage(error.message || "The current PDF could not be downloaded."); }
    finally { setBusyAction(""); }
  };

  const downloadAudit = async () => {
    setBusyAction("audit");
    try { downloadBlob(await createAuditTrail(selected), `${selected.fileName.replace(/\.pdf$/i, "")}-signing-activity.pdf`); }
    catch (error) { setMessage(error.message || "The activity record could not be created."); }
    finally { setBusyAction(""); }
  };

  const revoke = async () => {
    if (!window.confirm("Revoke this request? Recipient links will stop working.")) return;
    setBusyAction("revoke");
    try { await revokeCloudSignatureRequest({ db, storage, userId: currentUser.uid, requestId: selected.id }); await refresh(selected.id); }
    catch (error) { setMessage(error.message || "The request could not be revoked."); }
    finally { setBusyAction(""); }
  };

  const deleteRequest = async () => {
    if (!window.confirm("Permanently delete this request, its routing record, and stored PDFs?")) return;
    setBusyAction("delete");
    try { await deleteCloudSignatureRequest({ db, storage, userId: currentUser.uid, requestId: selected.id }); await refresh(""); }
    catch (error) { setMessage(error.message || "The request could not be deleted."); }
    finally { setBusyAction(""); }
  };

  return <section className="signature-manager">
    <header className="signature-manager-header"><div><span>Signature workflow</span><h2>Signature requests</h2><p>Track ordered recipients, verified account emails, reminders, fingerprints, and final files.</p></div><div><button type="button" onClick={() => refresh()} disabled={loading}><RefreshCw size={16} /> Refresh</button><button type="button" className="is-primary" onClick={onCreateRequest}><FileSignature size={17} /> New request</button></div></header>
    {message && <p className="signature-manager-message" role="status">{message}</p>}
    {loading ? <div className="signature-manager-empty"><Clock3 size={28} /><h3>Loading signature requests</h3></div> : !requests.length ? <div className="signature-manager-empty"><FileSignature size={34} /><h3>No signature requests yet</h3><p>Upload a PDF, place fields, and create an ordered request for one or more recipients.</p><button type="button" onClick={onCreateRequest}>Prepare a signature request</button></div> : <div className="signature-manager-layout">
      <aside className="signature-request-list" aria-label="Your signature requests">{requests.map((request) => <button key={request.id} type="button" className={selected?.id === request.id ? "is-selected" : ""} disabled={busyAction === `select-${request.id}`} onClick={() => selectRequest(request.id)}><span><FileSignature size={18} /></span><div><strong>{request.fileName}</strong><small>{request.recipientCount} recipient{request.recipientCount === 1 ? "" : "s"} · {formatDate(request.createdAt)}</small></div><StatusBadge status={request.status} expiresAt={request.expiresAt} /></button>)}</aside>
      {selected && <article className="signature-request-detail"><header><div><small>Request {selected.id.slice(0, 8)}</small><h3>{selected.fileName}</h3><p>Created {formatDate(selected.createdAt, true)} · expires {formatDate(selected.expiresAt, true)}</p></div><StatusBadge status={selected.status} expiresAt={selected.expiresAt} /></header>
        <div className="signature-request-progress"><span style={{ width: `${selected.recipients.filter((recipient) => recipient.status === "completed").length / selected.recipients.length * 100}%` }} /></div>
        <section className="signature-recipient-timeline"><h4>Signing order</h4>{selected.recipients.map((recipient, index) => <article key={recipient.id} className={`is-${recipient.status}`}><span>{recipient.status === "completed" ? <CheckCircle2 size={17} /> : index + 1}</span><div><strong>{recipient.name}</strong><small>{recipient.email}</small><small>{recipient.status === "completed" ? `Signed ${formatDate(recipient.signedAt, true)}` : recipient.status === "active" ? "Ready to sign now" : "Waiting for the previous signer"}</small>{recipient.authenticatedEmail && <em><ShieldCheck size={13} /> Google email matched</em>}</div><StatusBadge status={recipient.status} /><div className="signature-recipient-actions"><button type="button" onClick={() => copyInvitation(recipient)}><Copy size={15} /> {copied === recipient.id ? "Copied" : "Copy link"}</button>{recipient.status === "active" && displayedStatus(selected) === "active" && <button type="button" disabled={busyAction === `remind-${recipient.id}`} onClick={() => sendReminder(recipient)}><Mail size={15} /> Reminder</button>}</div></article>)}</section>
        <footer><div><strong>Fingerprint chain</strong><small>Current SHA-256: {selected.currentFingerprint?.slice(0, 20)}…</small></div><button type="button" disabled={busyAction === "audit"} onClick={downloadAudit}><ShieldCheck size={16} /> Activity PDF</button>{selected.status !== "revoked" && <button type="button" disabled={busyAction === "download"} onClick={downloadCurrentPdf}><Download size={16} /> {selected.status === "completed" ? "Final signed PDF" : "Current PDF"}</button>}{selected.status === "active" ? <button type="button" className="is-danger" disabled={busyAction === "revoke"} onClick={revoke}><XCircle size={16} /> Revoke</button> : <button type="button" className="is-danger" disabled={busyAction === "delete"} onClick={deleteRequest}><Trash2 size={16} /> Delete</button>}</footer>
        <p className="signature-manager-disclosure">Google email matching, server timestamps, and document fingerprints provide an account-attributed activity record. They do not provide government-ID verification, SMS validation, a qualified timestamp, or an independent certificate authority.</p>
      </article>}
    </div>}
    <a className="signature-manager-public-link" href={ROUTE_PATHS.signPdf}>Need to sign only your own PDF? Open Sign PDF</a>
  </section>;
}

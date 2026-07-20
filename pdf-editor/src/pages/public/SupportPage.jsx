import { useState } from "react";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2.mjs";
import LifeBuoy from "lucide-react/dist/esm/icons/life-buoy.mjs";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.mjs";
import LockKeyhole from "lucide-react/dist/esm/icons/lock-keyhole.mjs";
import Send from "lucide-react/dist/esm/icons/send.mjs";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { submitSupportRequest } from "../../support/supportRequests.js";
import "./support.css";

export function SupportPage() {
  const [form, setForm] = useState({ name: "", email: "", category: "product_help", message: "" });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setStatus("sending");
    setError("");
    const result = await submitSupportRequest(form);
    if (!result.ok) {
      setStatus("idle");
      setError(result.error);
      return;
    }
    setStatus("sent");
  };
  return <main className="support-page">
    <PageMetadata title="Support | FixThatPDF" description="Contact FixThatPDF support about product, account, privacy, or security questions." canonicalUrl={ROUTE_PATHS.support} />
    <section className="support-intro"><span><LifeBuoy size={16} /> FixThatPDF support</span><h1>Tell us what went wrong.</h1><p>Send a private request with enough detail to reproduce the problem. Never include passwords, payment details, or confidential PDF content.</p></section>
    <div className="support-layout"><form onSubmit={submit} className="support-form">
      {status === "sent" ? <div className="support-sent"><CheckCircle2 size={34} /><h2>Request received</h2><p>Your message is now in the owner-only support inbox. Keep this page open if you want to send another request.</p><button type="button" onClick={() => { setStatus("idle"); setForm({ name: "", email: "", category: "product_help", message: "" }); }}>Send another request</button></div> : <>
        <div className="support-fields"><label><span>Name</span><input value={form.name} onChange={(event) => update("name", event.target.value)} autoComplete="name" maxLength="80" /></label><label><span>Email for reply</span><input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" maxLength="160" /></label></div>
        <label><span>What do you need help with?</span><select value={form.category} onChange={(event) => update("category", event.target.value)}><option value="product_help">Using FixThatPDF</option><option value="bug">Something is broken</option><option value="account">Account or login</option><option value="privacy">Privacy or data deletion</option><option value="security">Security report</option><option value="other">Other</option></select></label>
        <label><span>Message</span><textarea rows="8" value={form.message} onChange={(event) => update("message", event.target.value)} maxLength="4000" placeholder="What were you doing, what happened, and which browser/device were you using?" /><small>{form.message.length}/4,000</small></label>
        {error && <div className="support-error" role="alert">{error}</div>}
        <button className="support-submit" type="submit" disabled={status === "sending"}>{status === "sending" ? <><LoaderCircle className="is-spinning" size={18} /> Sending…</> : <><Send size={18} /> Send support request</>}</button>
      </>}
    </form><aside><LockKeyhole size={23} /><h2>What is stored</h2><p>Your name, reply email, selected category, message, account ID if signed in, and submission time are stored in Firebase. Only the site owner can open the support inbox.</p><p>Do not attach or paste PDF contents. FixThatPDF support does not need the document itself for an initial report.</p></aside></div>
  </main>;
}

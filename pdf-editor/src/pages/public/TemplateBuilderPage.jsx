import { useEffect, useMemo, useState } from "react";
import CircleDollarSign from "lucide-react/dist/esm/icons/circle-dollar-sign.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import FileCheck2 from "lucide-react/dist/esm/icons/file-check-2.mjs";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import Plus from "lucide-react/dist/esm/icons/plus.mjs";
import RotateCcw from "lucide-react/dist/esm/icons/rotate-ccw.mjs";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.mjs";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.mjs";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.mjs";
import { Link } from "react-router-dom";
import { trackProductEvent } from "../../analytics/productAnalytics.js";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { ToolGuideContent } from "../../components/public/ToolGuideContent.jsx";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import {
  calculateInvoiceTotals,
  createTemplatePdf,
  initialTemplateValues,
  TEMPLATE_DEFINITIONS,
  TEMPLATE_STYLES,
  validateTemplate,
} from "../../tools/documentTemplates.js";

const ICONS = {
  "resume-templates": FileText,
  "contract-templates": FileCheck2,
  "nda-templates": ShieldCheck,
  "invoice-templates": CircleDollarSign,
  "offer-letter-templates": FileText,
};

function money(value, symbol) {
  return `${symbol || "$"}${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Lines({ value }) {
  return String(value || "").split(/\n+/).filter(Boolean).map((line, index) => <p key={index}>{line}</p>);
}

function ResumePreview({ values }) {
  return <div className="template-paper-resume">
    <header><h2>{values.name}</h2><strong>{values.headline}</strong><p>{[values.email, values.phone, values.location].filter(Boolean).join(" • ")}</p></header>
    <section><h3>Profile</h3><p>{values.summary}</p></section>
    <section><h3>Experience</h3><Lines value={values.experience} /></section>
    <section><h3>Education</h3><Lines value={values.education} /></section>
    <section><h3>Skills</h3><p>{values.skills}</p></section>
  </div>;
}

function InvoicePreview({ values, items }) {
  const totals = calculateInvoiceTotals(items, values.taxRate);
  return <div className="template-paper-invoice">
    <header><div><h2>Invoice</h2><strong>{values.businessName}</strong><Lines value={values.businessDetails} /></div><dl><div><dt>Invoice</dt><dd>{values.invoiceNumber}</dd></div><div><dt>Issued</dt><dd>{values.issueDate}</dd></div><div><dt>Due</dt><dd>{values.dueDate}</dd></div></dl></header>
    <section><span>Bill to</span><strong>{values.clientName}</strong><Lines value={values.clientDetails} /></section>
    <table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{totals.items.map((item, index) => <tr key={index}><td>{item.description}</td><td>{item.quantity}</td><td>{money(item.rate, values.currency)}</td><td>{money(item.amount, values.currency)}</td></tr>)}</tbody></table>
    <div className="template-invoice-totals"><span>Subtotal <strong>{money(totals.subtotal, values.currency)}</strong></span><span>Tax ({Number(values.taxRate || 0)}%) <strong>{money(totals.tax, values.currency)}</strong></span><span>Total <strong>{money(totals.total, values.currency)}</strong></span></div>
    <footer><strong>Notes</strong><p>{values.notes}</p></footer>
  </div>;
}

function AgreementPreview({ toolId, values }) {
  const nda = toolId === "nda-templates";
  const sections = nda
    ? [["Purpose", values.purpose], ["Confidential information", values.confidentialDefinition], ["Term", values.term], ["Exclusions", values.exclusions], ["Governing law", values.governingLaw]]
    : [["Services", values.services], ["Payment", values.payment], ["Term", values.term], ["Termination", values.termination], ["Confidentiality", values.confidentiality], ["Governing law", values.governingLaw]];
  const title = nda ? `${values.agreementType} Nondisclosure Agreement` : values.title;
  const parties = nda ? `${values.disclosingParty} and ${values.receivingParty}` : `${values.partyA} and ${values.partyB}`;
  return <div className="template-paper-agreement"><header><h2>{title}</h2><p>Effective {values.effectiveDate}</p></header><p>This agreement is between <strong>{parties}</strong>.</p>{sections.map(([label, body], index) => <section key={label}><h3>{index + 1}. {label}</h3><p>{body}</p></section>)}<div className="template-signatures"><span>Signature / Date</span><span>Signature / Date</span></div></div>;
}

function OfferPreview({ values }) {
  return <div className="template-paper-letter"><header><strong>{values.company}</strong><span>{new Date().toLocaleDateString()}</span></header><p>{values.candidate}</p><h2>Offer of employment — {values.jobTitle}</h2><p>Dear {values.candidate},</p><p>{values.company} is pleased to offer you the {String(values.employmentType || "").toLowerCase()} position of <strong>{values.jobTitle}</strong>, reporting to {values.manager}. Your proposed start date is {values.startDate}, based in {values.location}.</p><h3>Compensation</h3><p>{values.salary}</p><h3>Benefits</h3><p>{values.benefits}</p><h3>Conditions</h3><p>{values.contingencies}</p><p>Please sign and return this letter by {values.expirationDate}.</p><footer>Sincerely,<br /><strong>{values.signer}</strong></footer></div>;
}

function Preview({ toolId, values, items }) {
  if (toolId === "resume-templates") return <ResumePreview values={values} />;
  if (toolId === "invoice-templates") return <InvoicePreview values={values} items={items} />;
  if (["contract-templates", "nda-templates"].includes(toolId)) return <AgreementPreview toolId={toolId} values={values} />;
  return <OfferPreview values={values} />;
}

function loadDraft(toolId, definition) {
  const fallback = { values: initialTemplateValues(toolId), items: definition.items || [], styleId: "modern" };
  if (typeof localStorage === "undefined") return fallback;
  try {
    const draft = JSON.parse(localStorage.getItem(`fixthepdf-template:${toolId}`) || "null");
    return draft && typeof draft.values === "object" ? { ...fallback, ...draft } : fallback;
  } catch {
    return fallback;
  }
}

export function TemplateBuilderPage({ tool }) {
  const definition = TEMPLATE_DEFINITIONS[tool.id];
  const initial = useMemo(() => loadDraft(tool.id, definition), [tool.id, definition]);
  const [values, setValues] = useState(initial.values);
  const [items, setItems] = useState(initial.items);
  const [styleId, setStyleId] = useState(initial.styleId);
  const [status, setStatus] = useState("ready");
  const [message, setMessage] = useState("Your draft saves only in this browser.");
  const Icon = ICONS[tool.id] || FileText;

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(`fixthepdf-template:${tool.id}`, JSON.stringify({ values, items, styleId }));
  }, [items, styleId, tool.id, values]);

  const setValue = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const reset = () => {
    setValues(initialTemplateValues(tool.id));
    setItems(definition.items || []);
    setStyleId("modern");
    setMessage("Template reset to the sample draft.");
  };

  const exportPdf = async () => {
    const error = validateTemplate(tool.id, values, items);
    if (error) return setMessage(error);
    setStatus("exporting"); setMessage("Building your searchable PDF…");
    try {
      const bytes = await createTemplatePdf(tool.id, values, { styleId, items });
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = definition.fileName; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("ready"); setMessage("PDF downloaded. Review every detail before sharing or signing.");
      trackProductEvent("pdf_downloaded", { toolId: tool.id });
      trackProductEvent("export_succeeded", { toolId: tool.id });
    } catch (error) {
      setStatus("ready"); setMessage(error?.message || "The PDF could not be created.");
      trackProductEvent("export_failed", { toolId: tool.id, errorCategory: "template_export_failed" });
    }
  };

  const updateItem = (index, key, value) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const accent = TEMPLATE_STYLES.find((style) => style.id === styleId)?.accent || TEMPLATE_STYLES[0].accent;
  const accentCss = `rgb(${accent.map((channel) => Math.round(channel * 255)).join(" ")})`;

  return <main className="template-builder-page">
    <PageMetadata title={tool.seoTitle} description={tool.metaDescription} canonicalUrl={tool.canonicalUrl} />
    <nav className="tool-breadcrumbs" aria-label="Breadcrumb"><Link to={ROUTE_PATHS.tools}>PDF tools</Link><span>/</span><span aria-current="page">{tool.name}</span></nav>
    <section className="template-builder-hero"><div><span><Sparkles size={15} /> Available · editable PDF template</span><h1>{definition.title}</h1><p>{definition.description}</p></div><aside><ShieldCheck size={22} /><strong>Private browser draft</strong><small>Fields stay on this device and are never added to analytics.</small></aside></section>
    <section className="template-builder-workspace">
      <div className="template-form-card">
        <header><span><Icon size={21} /></span><div><h2>Edit your {tool.name.toLowerCase()}</h2><p>Changes appear in the preview as you type.</p></div></header>
        <fieldset className="template-style-picker"><legend>Design style</legend>{TEMPLATE_STYLES.map((style) => <label key={style.id} className={styleId === style.id ? "is-selected" : ""}><input type="radio" name="template-style" value={style.id} checked={styleId === style.id} onChange={() => setStyleId(style.id)} /><i style={{ background: `rgb(${style.accent.map((channel) => Math.round(channel * 255)).join(" ")})` }} />{style.name}</label>)}</fieldset>
        <div className="template-field-grid">{definition.fields.map(([key, label, type, , options]) => <label key={key} className={type === "textarea" ? "is-wide" : ""}><span>{label}</span>{type === "textarea" ? <textarea value={values[key]} onChange={(event) => setValue(key, event.target.value)} /> : type === "select" ? <select value={values[key]} onChange={(event) => setValue(key, event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select> : <input type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? "0.01" : undefined} value={values[key]} onChange={(event) => setValue(key, event.target.value)} />}</label>)}</div>
        {definition.invoice ? <fieldset className="template-line-items"><legend>Line items</legend>{items.map((item, index) => <div key={index}><label><span>Description</span><input value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} /></label><label><span>Quantity</span><input type="number" min="0" step="0.01" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} /></label><label><span>Rate</span><input type="number" min="0" step="0.01" value={item.rate} onChange={(event) => updateItem(index, "rate", event.target.value)} /></label><button type="button" aria-label={`Remove line item ${index + 1}`} disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button></div>)}<button type="button" onClick={() => setItems((current) => [...current, { description: "", quantity: "1", rate: "0" }])}><Plus size={16} /> Add line item</button></fieldset> : null}
        {definition.legal ? <p className="template-legal-note"><ShieldCheck size={16} /> Template for drafting and review—not legal advice. Requirements vary by location and situation.</p> : null}
        <div className="template-form-actions"><button type="button" className="template-reset" onClick={reset}><RotateCcw size={16} /> Reset</button><button type="button" className="template-export" disabled={status === "exporting"} onClick={() => void exportPdf()}><Download size={17} /> {status === "exporting" ? "Creating PDF…" : "Download PDF"}</button></div>
        <p className="template-status" aria-live="polite">{message}</p>
      </div>
      <aside className="template-preview-card"><header><div><strong>Live PDF preview</strong><span>US Letter · searchable text</span></div><span>Review before use</span></header><div className="template-preview-scroll" style={{ "--template-accent": accentCss }}><Preview toolId={tool.id} values={values} items={items} /></div></aside>
    </section>
    <section className="template-builder-disclosure"><h2>Built for an honest public workflow</h2><p>The generated file is a real searchable PDF. FixThatPDF does not send field content to analytics, provide legal advice, validate employment decisions, collect signatures, or file invoices for you.</p></section>
    <ToolGuideContent tool={tool} />
  </main>;
}

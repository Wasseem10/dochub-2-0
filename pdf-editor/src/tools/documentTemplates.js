import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { wrapPlainText } from "./textConversion.js";

export const TEMPLATE_STYLES = Object.freeze([
  { id: "modern", name: "Modern blue", accent: [0.16, 0.31, 0.78] },
  { id: "classic", name: "Classic ink", accent: [0.12, 0.15, 0.2] },
  { id: "green", name: "Fresh green", accent: [0.04, 0.48, 0.32] },
]);

const today = new Date().toISOString().slice(0, 10);

export const TEMPLATE_DEFINITIONS = Object.freeze({
  "resume-templates": {
    eyebrow: "Career document",
    title: "Build a polished resume",
    description: "Write and preview a clean, one-page-first resume, then export a searchable PDF.",
    fileName: "resume.pdf",
    fields: [
      ["name", "Full name", "text", "Jordan Lee"],
      ["headline", "Professional headline", "text", "Operations Manager"],
      ["email", "Email", "email", "jordan@example.com"],
      ["phone", "Phone", "tel", "(555) 014-8820"],
      ["location", "Location", "text", "New York, NY"],
      ["summary", "Professional summary", "textarea", "Operations leader with 8 years of experience improving service quality, team performance, and delivery systems."],
      ["experience", "Experience", "textarea", "Operations Manager — Northwind Studio (2021–Present)\n• Reduced turnaround time by 28% by redesigning intake and review.\n• Led a 12-person cross-functional team.\n\nProject Lead — Contoso Group (2018–2021)\n• Delivered 30+ client projects on time and within budget."],
      ["education", "Education", "textarea", "B.S. Business Administration — State University, 2018"],
      ["skills", "Skills", "textarea", "Operations strategy, Process improvement, Project management, Excel, Team leadership"],
    ],
  },
  "contract-templates": {
    eyebrow: "Business agreement",
    title: "Draft a service contract",
    description: "Create a straightforward agreement outline for review by the parties and qualified legal counsel.",
    fileName: "service-contract.pdf",
    legal: true,
    fields: [
      ["title", "Agreement title", "text", "Professional Services Agreement"],
      ["effectiveDate", "Effective date", "date", today],
      ["partyA", "Service provider", "text", "Northwind Studio LLC"],
      ["partyB", "Client", "text", "Contoso Group Inc."],
      ["services", "Services", "textarea", "Provider will deliver the consulting services described in mutually approved statements of work."],
      ["payment", "Payment terms", "textarea", "Client will pay approved invoices within 30 days of receipt."],
      ["term", "Term", "textarea", "This agreement begins on the effective date and continues for 12 months unless ended earlier under this agreement."],
      ["termination", "Termination", "textarea", "Either party may terminate with 30 days' written notice. Accrued payment obligations survive termination."],
      ["confidentiality", "Confidentiality", "textarea", "Each party will protect the other party's confidential information using reasonable care and use it only to perform this agreement."],
      ["governingLaw", "Governing law", "text", "State of New York"],
    ],
  },
  "nda-templates": {
    eyebrow: "Confidentiality agreement",
    title: "Create an NDA draft",
    description: "Prepare a mutual or one-way confidentiality agreement for review before anyone signs.",
    fileName: "nda.pdf",
    legal: true,
    fields: [
      ["agreementType", "Agreement type", "select", "Mutual", ["Mutual", "One-way"]],
      ["effectiveDate", "Effective date", "date", today],
      ["disclosingParty", "Disclosing party", "text", "Northwind Studio LLC"],
      ["receivingParty", "Receiving party", "text", "Contoso Group Inc."],
      ["purpose", "Permitted purpose", "textarea", "Evaluating a potential business relationship between the parties."],
      ["confidentialDefinition", "Confidential information", "textarea", "Non-public business, financial, product, technical, customer, and operational information disclosed in any form and identified as confidential or reasonably understood to be confidential."],
      ["term", "Confidentiality term", "text", "3 years after each disclosure"],
      ["exclusions", "Standard exclusions", "textarea", "Information is excluded if it is public through no breach, already known without restriction, independently developed, or lawfully received from a third party."],
      ["governingLaw", "Governing law", "text", "State of New York"],
    ],
  },
  "invoice-templates": {
    eyebrow: "Billing document",
    title: "Create a professional invoice",
    description: "Add line items, calculate totals automatically, and export a client-ready PDF.",
    fileName: "invoice.pdf",
    invoice: true,
    fields: [
      ["businessName", "Business name", "text", "Northwind Studio LLC"],
      ["businessDetails", "Business address and contact", "textarea", "123 Market Street\nNew York, NY 10001\nbilling@northwind.example"],
      ["clientName", "Bill to", "text", "Contoso Group Inc."],
      ["clientDetails", "Client address and contact", "textarea", "500 Madison Avenue\nNew York, NY 10022"],
      ["invoiceNumber", "Invoice number", "text", "INV-1001"],
      ["issueDate", "Issue date", "date", today],
      ["dueDate", "Due date", "date", today],
      ["currency", "Currency symbol", "text", "$"],
      ["taxRate", "Tax rate (%)", "number", "0"],
      ["notes", "Payment notes", "textarea", "Thank you for your business. Please include the invoice number with payment."],
    ],
    items: [
      { description: "Consulting services", quantity: "8", rate: "150" },
      { description: "Project materials", quantity: "1", rate: "240" },
    ],
  },
  "offer-letter-templates": {
    eyebrow: "Hiring document",
    title: "Prepare an offer letter",
    description: "Create a clear employment offer draft with role, compensation, start date, and acceptance details.",
    fileName: "offer-letter.pdf",
    legal: true,
    fields: [
      ["company", "Company", "text", "Northwind Studio LLC"],
      ["candidate", "Candidate name", "text", "Jordan Lee"],
      ["jobTitle", "Job title", "text", "Operations Manager"],
      ["manager", "Reports to", "text", "Taylor Morgan, Director of Operations"],
      ["startDate", "Proposed start date", "date", today],
      ["salary", "Compensation", "text", "$95,000 per year, paid according to the company's regular payroll schedule"],
      ["location", "Work location", "text", "New York, NY — hybrid"],
      ["employmentType", "Employment type", "select", "Full-time", ["Full-time", "Part-time", "Contract"]],
      ["benefits", "Benefits summary", "textarea", "Eligibility for the company's health, retirement, and paid-time-off plans, subject to plan terms and waiting periods."],
      ["contingencies", "Contingencies", "textarea", "This offer is contingent on verification of work authorization and completion of the company's standard pre-employment requirements."],
      ["expirationDate", "Offer expires", "date", today],
      ["signer", "Company signer", "text", "Taylor Morgan, Director of Operations"],
    ],
  },
});

export function initialTemplateValues(templateId) {
  const definition = TEMPLATE_DEFINITIONS[templateId];
  return Object.fromEntries(definition.fields.map(([key, , , value]) => [key, value]));
}

function number(value) {
  const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function calculateInvoiceTotals(items, taxRate) {
  const normalizedItems = (items || []).map((item) => ({
    ...item,
    amount: Math.round((number(item.quantity) * number(item.rate) + 1e-9) * 100) / 100,
  }));
  const subtotal = Math.round((normalizedItems.reduce((sum, item) => sum + item.amount, 0) + Number.EPSILON) * 100) / 100;
  const tax = Math.round((subtotal * number(taxRate) / 100 + Number.EPSILON) * 100) / 100;
  return { items: normalizedItems, subtotal, tax, total: Math.round((subtotal + tax + Number.EPSILON) * 100) / 100 };
}

function safe(text) {
  const normalized = String(text ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...");
  return Array.from(normalized, (character) => {
    const code = character.charCodeAt(0);
    return code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126) || (code >= 160 && code <= 255) ? character : "?";
  }).join("");
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

function requiredError(templateId, values, items) {
  const definition = TEMPLATE_DEFINITIONS[templateId];
  if (!definition) return "Choose a supported template.";
  const missing = definition.fields.filter(([key, , type]) => type !== "number" && !String(values?.[key] || "").trim());
  if (missing.length) return `Complete ${missing[0][1].toLowerCase()} before exporting.`;
  if (definition.invoice && !(items || []).some((item) => String(item.description || "").trim() && number(item.quantity) > 0)) return "Add at least one invoice line item with a description and quantity.";
  return "";
}

export function validateTemplate(templateId, values, items) {
  return requiredError(templateId, values, items);
}

export async function createTemplatePdf(templateId, values, { styleId = "modern", items = [] } = {}) {
  const definition = TEMPLATE_DEFINITIONS[templateId];
  const validation = requiredError(templateId, values, items);
  if (validation) throw new Error(validation);

  const pdf = await PDFDocument.create();
  pdf.setTitle(safe(values.title || definition.title).slice(0, 120));
  pdf.setAuthor(safe(values.businessName || values.company || values.name || "PDFArrow user").slice(0, 120));
  pdf.setCreator("PDFArrow template builder");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const style = TEMPLATE_STYLES.find((item) => item.id === styleId) || TEMPLATE_STYLES[0];
  const accent = rgb(...style.accent);
  const ink = rgb(0.09, 0.12, 0.18);
  const muted = rgb(0.37, 0.42, 0.5);
  const line = rgb(0.86, 0.88, 0.92);
  const pageSize = [612, 792];
  const margin = 54;
  let page;
  let y;

  const addPage = () => {
    page = pdf.addPage(pageSize);
    y = 738;
    page.drawRectangle({ x: 0, y: 786, width: 612, height: 6, color: accent });
    return page;
  };

  const ensure = (height = 24) => {
    if (!page || y - height < 48) addPage();
  };

  const text = (value, { x = margin, size = 10.5, font = regular, color = ink, maxWidth = 612 - margin * 2, lineHeight = size * 1.45, gap = 0 } = {}) => {
    const lines = wrapPlainText(safe(value), font, size, maxWidth);
    for (const current of lines) {
      ensure(lineHeight);
      if (current) page.drawText(current, { x, y, size, font, color });
      y -= lineHeight;
    }
    y -= gap;
  };

  const rule = () => {
    ensure(18);
    page.drawLine({ start: { x: margin, y }, end: { x: 612 - margin, y }, thickness: 1, color: line });
    y -= 18;
  };

  const heading = (value) => {
    ensure(35);
    text(String(value).toUpperCase(), { size: 9, font: bold, color: accent, lineHeight: 12, gap: 6 });
  };

  const section = (title, body) => {
    if (!String(body || "").trim()) return;
    heading(title);
    text(body, { size: 10.5, lineHeight: 15, gap: 12 });
  };

  addPage();

  if (templateId === "resume-templates") {
    text(values.name, { size: 25, font: bold, color: accent, lineHeight: 29 });
    text(values.headline, { size: 13, font: bold, lineHeight: 18 });
    text([values.email, values.phone, values.location].filter(Boolean).join("  |  "), { size: 9.5, color: muted, lineHeight: 15, gap: 5 });
    rule();
    section("Profile", values.summary);
    section("Experience", values.experience);
    section("Education", values.education);
    section("Skills", values.skills);
  } else if (templateId === "invoice-templates") {
    text("INVOICE", { size: 29, font: bold, color: accent, lineHeight: 34 });
    text(values.businessName, { size: 14, font: bold, lineHeight: 19 });
    text(values.businessDetails, { size: 9.5, color: muted, lineHeight: 13, gap: 8 });
    rule();
    text(`Invoice ${values.invoiceNumber}`, { size: 12, font: bold, lineHeight: 17 });
    text(`Issued ${formatDate(values.issueDate)}  |  Due ${formatDate(values.dueDate)}`, { size: 9.5, color: muted, lineHeight: 14, gap: 8 });
    heading("Bill to");
    text(values.clientName, { size: 11, font: bold, lineHeight: 15 });
    text(values.clientDetails, { size: 9.5, color: muted, lineHeight: 13, gap: 12 });
    const totals = calculateInvoiceTotals(items, values.taxRate);
    const currency = safe(values.currency || "$");
    ensure(35);
    page.drawRectangle({ x: margin, y: y - 4, width: 504, height: 24, color: rgb(0.95, 0.96, 0.99) });
    page.drawText("Description", { x: margin + 8, y: y + 4, size: 9, font: bold, color: ink });
    page.drawText("Qty", { x: 386, y: y + 4, size: 9, font: bold, color: ink });
    page.drawText("Rate", { x: 431, y: y + 4, size: 9, font: bold, color: ink });
    page.drawText("Amount", { x: 500, y: y + 4, size: 9, font: bold, color: ink });
    y -= 31;
    totals.items.forEach((item) => {
      ensure(28);
      const description = safe(item.description || "Line item").slice(0, 50);
      page.drawText(description, { x: margin + 8, y, size: 9.5, font: regular, color: ink });
      page.drawText(String(number(item.quantity)), { x: 388, y, size: 9.5, font: regular, color: ink });
      page.drawText(`${currency}${number(item.rate).toFixed(2)}`, { x: 431, y, size: 9.5, font: regular, color: ink });
      page.drawText(`${currency}${item.amount.toFixed(2)}`, { x: 500, y, size: 9.5, font: regular, color: ink });
      y -= 24;
    });
    rule();
    const totalLine = (label, value, emphasized = false) => {
      ensure(20);
      page.drawText(label, { x: 420, y, size: emphasized ? 11 : 9.5, font: emphasized ? bold : regular, color: emphasized ? accent : ink });
      page.drawText(`${currency}${value.toFixed(2)}`, { x: 500, y, size: emphasized ? 11 : 9.5, font: emphasized ? bold : regular, color: emphasized ? accent : ink });
      y -= emphasized ? 24 : 18;
    };
    totalLine("Subtotal", totals.subtotal);
    totalLine(`Tax (${number(values.taxRate)}%)`, totals.tax);
    totalLine("Total", totals.total, true);
    section("Notes", values.notes);
  } else if (templateId === "contract-templates") {
    text(values.title, { size: 22, font: bold, color: accent, lineHeight: 28, gap: 4 });
    text(`Effective date: ${formatDate(values.effectiveDate)}`, { size: 10, color: muted, lineHeight: 15, gap: 6 });
    rule();
    text(`This ${safe(values.title)} is between ${safe(values.partyA)} ("Provider") and ${safe(values.partyB)} ("Client").`, { size: 10.5, lineHeight: 15, gap: 14 });
    section("1. Services", values.services);
    section("2. Payment", values.payment);
    section("3. Term", values.term);
    section("4. Termination", values.termination);
    section("5. Confidentiality", values.confidentiality);
    section("6. Governing law", `This agreement is governed by the laws of ${values.governingLaw}.`);
    rule();
    text(`${values.partyA}\n\nSignature: ______________________________    Date: ______________\n\n${values.partyB}\n\nSignature: ______________________________    Date: ______________`, { size: 10, lineHeight: 16 });
  } else if (templateId === "nda-templates") {
    text(`${values.agreementType} Nondisclosure Agreement`, { size: 21, font: bold, color: accent, lineHeight: 27, gap: 4 });
    text(`Effective date: ${formatDate(values.effectiveDate)}`, { size: 10, color: muted, lineHeight: 15, gap: 6 });
    rule();
    text(`This agreement is between ${safe(values.disclosingParty)} and ${safe(values.receivingParty)}. The parties wish to evaluate: ${safe(values.purpose)}`, { size: 10.5, lineHeight: 15, gap: 14 });
    section("1. Confidential information", values.confidentialDefinition);
    section("2. Use and protection", `${values.agreementType === "Mutual" ? "Each receiving party" : values.receivingParty} will use confidential information only for the permitted purpose, limit access to people who need it, and protect it using reasonable care.`);
    section("3. Exclusions", values.exclusions);
    section("4. Required disclosure", "A receiving party may disclose information when legally required after giving prompt notice where permitted and reasonable assistance in seeking protection.");
    section("5. Term", `Confidentiality obligations continue for ${values.term}.`);
    section("6. Governing law", `This agreement is governed by the laws of ${values.governingLaw}.`);
    rule();
    text(`${values.disclosingParty}\n\nSignature: ______________________________    Date: ______________\n\n${values.receivingParty}\n\nSignature: ______________________________    Date: ______________`, { size: 10, lineHeight: 16 });
  } else {
    text(values.company, { size: 14, font: bold, color: accent, lineHeight: 19 });
    text(formatDate(today), { size: 9.5, color: muted, lineHeight: 14, gap: 15 });
    text(values.candidate, { size: 11, font: bold, lineHeight: 16 });
    text(`Re: Offer of employment as ${values.jobTitle}`, { size: 11, font: bold, color: accent, lineHeight: 18, gap: 8 });
    text(`Dear ${safe(values.candidate)},`, { size: 10.5, lineHeight: 18, gap: 5 });
    text(`${safe(values.company)} is pleased to offer you the ${safe(values.employmentType).toLowerCase()} position of ${safe(values.jobTitle)}, reporting to ${safe(values.manager)}. Your proposed start date is ${formatDate(values.startDate)}, and your primary work location will be ${safe(values.location)}.`, { size: 10.5, lineHeight: 16, gap: 12 });
    section("Compensation", values.salary);
    section("Benefits", values.benefits);
    section("Conditions", values.contingencies);
    text(`Please sign and return this letter by ${formatDate(values.expirationDate)} if you accept this offer. This letter replaces prior discussions about the terms described here.`, { size: 10.5, lineHeight: 16, gap: 16 });
    text(`Sincerely,\n\n${values.signer}\n${values.company}\n\nAccepted by: ____________________________    Date: ______________`, { size: 10.5, lineHeight: 17 });
  }

  if (definition.legal) {
    ensure(42);
    y -= 8;
    page.drawLine({ start: { x: margin, y }, end: { x: 612 - margin, y }, thickness: 1, color: line });
    y -= 15;
    text("Template for review only. PDFArrow does not provide legal advice. Laws and required terms vary; have qualified counsel review this draft before use or signature.", { size: 7.5, font: italic, color: muted, lineHeight: 10 });
  }

  const pages = pdf.getPages();
  pages.forEach((pdfPage, index) => {
    pdfPage.drawText(`Created privately with PDFArrow  |  Page ${index + 1} of ${pages.length}`, { x: margin, y: 24, size: 7, font: regular, color: muted });
  });
  return pdf.save();
}

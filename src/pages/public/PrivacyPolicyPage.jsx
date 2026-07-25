import { Link } from "react-router-dom";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2.mjs";
import Database from "lucide-react/dist/esm/icons/database.mjs";
import FileLock2 from "lucide-react/dist/esm/icons/file-lock-2.mjs";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.mjs";
import SlidersHorizontal from "lucide-react/dist/esm/icons/sliders-horizontal.mjs";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { PrivacyChoicePanel } from "../../components/privacy/PrivacyChoices.jsx";
import {
  OPTIONAL_ANALYTICS_RETENTION_DAYS,
  PRIVACY_POLICY_EFFECTIVE_DATE,
  SUPPORT_REQUEST_RETENTION_DAYS,
} from "../../privacy/privacyConfig.js";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import "./privacy-policy.css";

const sections = [
  ["summary", "Plain-language summary"],
  ["scope", "Scope and controller"],
  ["collect", "Information we process"],
  ["files", "How PDF files are handled"],
  ["purposes", "Purposes and legal bases"],
  ["disclose", "When information is disclosed"],
  ["retention", "Retention and deletion"],
  ["rights", "Your privacy rights"],
  ["california", "California and U.S. state notice"],
  ["children", "Children"],
  ["security", "Security"],
  ["transfers", "International transfers"],
  ["changes", "Changes and contact"],
];

const dataRows = [
  {
    category: "Account identifiers",
    examples: "Name, email address, Firebase user ID, profile photo URL, sign-in provider, and last sign-in time.",
    source: "You and your chosen sign-in provider.",
    purpose: "Create and secure an optional account, restore access, and show account history.",
    disclosed: "Google Firebase and Google Sign-In.",
    retention: "Until account deletion, subject to provider security logs and backups.",
  },
  {
    category: "Browser-local document data",
    examples: "PDF bytes, images, edits, signatures, initials, form answers, extracted text, and workspace metadata.",
    source: "Files and content you choose.",
    purpose: "Run supported editing, signing, page, OCR, and conversion tools on your device.",
    disclosed: "Not sent to PDFArrow merely to run a supported local tool.",
    retention: "In memory until the tab closes; local saved work remains until you delete it or clear site data.",
  },
  {
    category: "Optional cloud documents",
    examples: "Document name, size, page count, source bytes, edits, thumbnails, and workspace state.",
    source: "You when signed in and using cloud history.",
    purpose: "Save document history and restore work across sessions or devices.",
    disclosed: "Google Cloud Firestore and Cloud Storage for Firebase.",
    retention: "Until you delete the document or account, plus limited provider backup periods.",
  },
  {
    category: "Shared PDFs and signing links",
    examples: "Exported PDF, file name, size, owner ID, random link token, expiration, and recipient/requester details included in the signing-link fragment.",
    source: "You when creating a share or signing request.",
    purpose: "Create a revocable link that a recipient can open until it expires.",
    disclosed: "Firebase; recipients and email providers you choose to use.",
    retention: "Links expire after 1, 7, or 30 days. Revocation or account deletion removes the active cloud copy; backups may take longer.",
  },
  {
    category: "Support information",
    examples: "Name, reply email, category, message, account ID if signed in, status, and timestamps.",
    source: "You through the support form.",
    purpose: "Respond to requests, investigate bugs, and handle privacy or security reports.",
    disclosed: "Firebase and the authorized PDFArrow operator.",
    retention: `Assigned a deletion date ${SUPPORT_REQUEST_RETENTION_DAYS} days after submission, unless needed longer for security, legal, or dispute handling.`,
  },
  {
    category: "Optional product analytics",
    examples: "Random browser ID, account ID if signed in, route, referring hostname, traffic category, device/browser family, tool used, broad file-size/page-count buckets, outcome, and performance/error category.",
    source: "Your browser after you allow optional analytics.",
    purpose: "Measure reliability and understand which workflows need improvement.",
    disclosed: "Firebase.",
    retention: `Assigned a deletion date ${OPTIONAL_ANALYTICS_RETENTION_DAYS} days after collection.`,
  },
  {
    category: "Security and hosting data",
    examples: "IP address, user agent, request timestamps, authentication events, and App Check or reCAPTCHA signals.",
    source: "Your device and service providers.",
    purpose: "Deliver the site, prevent abuse, authenticate users, and investigate security incidents.",
    disclosed: "Hosting providers, Google Firebase, Google reCAPTCHA Enterprise, and authorities when legally required.",
    retention: "According to the provider's operational, security, and legal retention schedule.",
  },
];

export function PrivacyPolicyPage() {
  return (
    <main className="privacy-policy-page">
      <PageMetadata
        title="Privacy Policy | PDFArrow"
        description="How PDFArrow processes browser-local PDFs, optional cloud documents, accounts, analytics, support requests, and privacy rights."
        canonicalUrl={ROUTE_PATHS.privacy}
      />

      <header className="privacy-policy-hero">
        <div className="privacy-policy-hero-grid">
          <div>
            <span className="privacy-policy-kicker"><ShieldCheck size={16} /> Privacy at PDFArrow</span>
            <h1>Your documents first. Your data minimized.</h1>
            <p>This policy explains exactly what stays in your browser, what can move to optional cloud services, why limited personal information is used, and how to control or delete it.</p>
            <small>Effective and last updated {PRIVACY_POLICY_EFFECTIVE_DATE}</small>
          </div>
          <aside aria-label="Privacy highlights">
            <small className="privacy-policy-snapshot-label">At a glance</small>
            <strong>No sale of personal information</strong>
            <span>No behavioral advertising</span>
            <span>No document content in analytics</span>
            <span>No AI training on your files</span>
          </aside>
        </div>
      </header>

      <section className="privacy-quick-facts" aria-label="Privacy overview">
        <article><FileLock2 size={22} /><div><strong>Local by default</strong><p>Supported PDF work runs in your browser unless you deliberately use a cloud feature.</p></div></article>
        <article><Database size={22} /><div><strong>Cloud is optional</strong><p>Accounts, cloud history, support, and sharing use Firebase and are clearly identified.</p></div></article>
        <article><SlidersHorizontal size={22} /><div><strong>Analytics require a choice</strong><p>Optional analytics stay off until you allow them, and Global Privacy Control is honored.</p></div></article>
      </section>

      <PrivacyChoicePanel />

      <div className="privacy-policy-layout">
        <aside className="privacy-policy-toc">
          <strong>On this page</strong>
          <nav aria-label="Privacy policy sections">{sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
          <Link to={ROUTE_PATHS.support}>Make a privacy request</Link>
        </aside>

        <article className="privacy-policy-content">
          <section id="summary">
            <span className="privacy-section-number">01</span>
            <h2>Plain-language summary</h2>
            <p>PDFArrow is designed so supported editing and conversion can happen on your device. Choosing a file does not, by itself, upload that file to PDFArrow. Data leaves your browser only when needed to deliver a feature you choose, such as signing in, saving to cloud history, submitting support, allowing optional analytics, or creating a share link.</p>
            <div className="privacy-promise-list">
              <p><CheckCircle2 size={17} /> PDFArrow does not sell personal information or share it for cross-context behavioral advertising.</p>
              <p><CheckCircle2 size={17} /> PDFArrow does not put file names, PDF contents, extracted text, signatures, form answers, or document URLs into product analytics.</p>
              <p><CheckCircle2 size={17} /> PDFArrow does not use your documents to train PDFArrow or third-party AI models.</p>
            </div>
          </section>

          <section id="scope">
            <span className="privacy-section-number">02</span>
            <h2>Scope and controller</h2>
            <p>This policy applies to pdfarrow.com, the PDFArrow web application, public PDF tools, accounts, support, cloud history, secure sharing, and signing-request links that reference it. It does not govern third-party websites you visit from PDFArrow.</p>
            <p><strong>Controller:</strong> PDFArrow, the operator of pdfarrow.com, determines why and how account, support, analytics, and cloud-feature information is processed. For document content placed into optional cloud storage or sharing by an organization, that organization may also have its own responsibilities.</p>
            <p>Questions and rights requests can be sent through the <Link to={ROUTE_PATHS.support}>PDFArrow Support page</Link> by selecting “Privacy or data deletion.”</p>
          </section>

          <section id="collect">
            <span className="privacy-section-number">03</span>
            <h2>Information we process</h2>
            <p>The table describes the categories handled during the preceding 12 months, their sources, purposes, disclosures, and intended retention. “Disclosed” means made available to a service provider for a business purpose; it does not mean sold.</p>
            <div className="privacy-data-table-wrap">
              <table className="privacy-data-table">
                <thead><tr><th>Category</th><th>Examples and source</th><th>Purpose and disclosure</th><th>Retention</th></tr></thead>
                <tbody>{dataRows.map((row) => <tr key={row.category}>
                  <th scope="row">{row.category}</th>
                  <td><p>{row.examples}</p><small>Source: {row.source}</small></td>
                  <td><p>{row.purpose}</p><small>Disclosed to: {row.disclosed}</small></td>
                  <td>{row.retention}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </section>

          <section id="files">
            <span className="privacy-section-number">04</span>
            <h2>How PDF files are handled</h2>
            <h3>Browser-only workflows</h3>
            <p>The editor and supported page, image, protection, OCR, and conversion tools process files in browser memory. Saved guest work may use IndexedDB or local storage on your device. Clearing PDFArrow site data removes those browser copies, but PDFArrow cannot delete downloads, browser backups, or copies you saved elsewhere.</p>
            <h3>Optional cloud history</h3>
            <p>When cloud history is enabled for a signed-in account, document records and workspace payloads can be stored in Firebase. Delete individual documents in PDFArrow or delete the entire account to remove active account-linked cloud records.</p>
            <h3>Sharing and signing requests</h3>
            <p>Creating a sharing or signing link uploads the exported PDF to Firebase. Anyone with the random link can open or download it until expiration or revocation. Recipient name, recipient email, requester details, and the optional message are encoded in the signing link fragment and may also pass through the email provider you use to send the link. Do not create a link unless you are authorized to disclose the document and recipient information.</p>
          </section>

          <section id="purposes">
            <span className="privacy-section-number">05</span>
            <h2>Purposes and legal bases</h2>
            <ul>
              <li><strong>Provide requested services and accounts:</strong> necessary to perform the service you request or take steps at your request.</li>
              <li><strong>Support and communications:</strong> necessary to respond to you and based on PDFArrow's legitimate interest in resolving product, privacy, and security issues.</li>
              <li><strong>Security, fraud prevention, and service integrity:</strong> based on legitimate interests and, where applicable, legal obligations.</li>
              <li><strong>Optional product analytics:</strong> based on your consent. You can withdraw that choice at any time in the privacy controls above.</li>
              <li><strong>Legal compliance:</strong> necessary to respond to valid legal process, protect rights and safety, and establish or defend legal claims.</li>
            </ul>
            <p>PDFArrow does not make decisions producing legal or similarly significant effects through automated profiling.</p>
          </section>

          <section id="disclose">
            <span className="privacy-section-number">06</span>
            <h2>When information is disclosed</h2>
            <p>PDFArrow limits disclosure to the following situations:</p>
            <ul>
              <li><strong>Service providers:</strong> website hosting and content delivery providers; Google Firebase Authentication, Firestore, Storage, App Check, reCAPTCHA Enterprise, and Google Sign-In.</li>
              <li><strong>People you direct:</strong> recipients of sharing or signing links and email providers you use to send them.</li>
              <li><strong>Legal and safety:</strong> authorities or other parties when reasonably necessary to comply with law, protect users, investigate abuse, or defend legal rights.</li>
              <li><strong>Business transition:</strong> a buyer, successor, or adviser in a merger, financing, reorganization, or sale, subject to appropriate confidentiality and notice where required.</li>
            </ul>
            <p>PDFArrow does not sell personal information, rent contact lists, run third-party behavioral ads, or share personal information for cross-context behavioral advertising.</p>
            <p>Provider policies: <a href="https://vercel.com/legal/privacy-notice" target="_blank" rel="noreferrer">Vercel Privacy Notice</a> and <a href="https://firebase.google.com/support/privacy/" target="_blank" rel="noreferrer">Firebase Privacy and Security</a>.</p>
          </section>

          <section id="retention">
            <span className="privacy-section-number">07</span>
            <h2>Retention and deletion</h2>
            <p>PDFArrow uses category-specific limits rather than keeping every record indefinitely. The intended periods are listed in the information table above.</p>
            <ul>
              <li>Browser memory is released when the page closes. Browser-local saved work remains until you delete it or clear site data.</li>
              <li>Cloud documents and account profiles remain until the document or account is deleted.</li>
              <li>Optional analytics receive a deletion date of {OPTIONAL_ANALYTICS_RETENTION_DAYS} days.</li>
              <li>Support requests receive a deletion date of {SUPPORT_REQUEST_RETENTION_DAYS} days unless a longer period is reasonably necessary for security, legal, or dispute handling.</li>
              <li>Share links stop working after 1, 7, or 30 days. Expiration prevents access; physical deletion may follow through revocation, account deletion, or provider retention cleanup.</li>
            </ul>
            <p>Deletion from active systems may not immediately remove encrypted backups, security logs, cached copies, or copies already downloaded or shared. Those copies follow separate technical or legal schedules.</p>
          </section>

          <section id="rights">
            <span className="privacy-section-number">08</span>
            <h2>Your privacy rights</h2>
            <p>Depending on where you live, you may have rights to access, know, correct, delete, restrict, object, withdraw consent, obtain a portable copy, or appeal a decision about your personal information.</p>
            <ol>
              <li>Use Settings to delete a signed-in account and its active account-linked cloud documents, shares, analytics, profile, and support records.</li>
              <li>Delete browser-local work or clear PDFArrow site data in your browser.</li>
              <li>Use the controls above to allow or reject optional analytics.</li>
              <li>For anything not covered by self-service tools, submit a request through <Link to={ROUTE_PATHS.support}>Support</Link>.</li>
            </ol>
            <p>PDFArrow may verify a request through the signed-in account, access to the reply email, or information reasonably necessary to match the record. Authorized agents may submit requests, but PDFArrow may require proof of authority and verification of the consumer. PDFArrow will not discriminate against you for exercising a privacy right.</p>
            <p>EEA and UK residents may also complain to the data-protection authority where they live, work, or believe an infringement occurred.</p>
          </section>

          <section id="california">
            <span className="privacy-section-number">09</span>
            <h2>California and U.S. state notice</h2>
            <p>The information table above provides the categories collected, sources, business purposes, service-provider disclosures, and retention periods for the preceding 12 months. PDFArrow does not sell personal information or share it for cross-context behavioral advertising, including information about consumers under 16.</p>
            <p>Where applicable, residents may request access/knowledge, correction, deletion, portability, restriction of certain processing, or an appeal. Because PDFArrow does not sell or behaviorally share personal information, there is no sale/share opt-out needed for current practices. PDFArrow treats Global Privacy Control as a request to keep optional analytics off.</p>
            <p>PDFArrow uses sensitive information that a document may contain only to provide a feature the user deliberately selects, protect the service, or meet legal obligations. PDFArrow does not use document content to infer personal characteristics for advertising.</p>
          </section>

          <section id="children">
            <span className="privacy-section-number">10</span>
            <h2>Children</h2>
            <p>PDFArrow is a general-audience document service and is not directed to children under 13. PDFArrow does not knowingly create accounts for or collect personal information from children under 13. If you believe a child provided personal information, contact PDFArrow through Support so it can be reviewed and deleted. Schools and guardians must ensure any supervised use meets applicable education and children's privacy requirements.</p>
          </section>

          <section id="security">
            <span className="privacy-section-number">11</span>
            <h2>Security</h2>
            <p>PDFArrow uses browser-local processing where practical, HTTPS in production, Firebase access controls, randomly generated sharing tokens, time-limited links, App Check/reCAPTCHA abuse controls, owner-restricted account data, and deletion tools. Access to account directories, analytics, and support records is restricted to authorized operator workflows.</p>
            <p>No system is perfectly secure. PDFArrow does not claim ISO certification, end-to-end encryption, HIPAA compliance, a business-associate agreement, or an external security audit unless a separate page expressly documents it. Use local-only tools for highly sensitive files and avoid cloud history or sharing unless your organization has approved those services.</p>
            <p>If a security incident creates a legal notification obligation, PDFArrow will investigate and provide notices required by applicable law.</p>
          </section>

          <section id="transfers">
            <span className="privacy-section-number">12</span>
            <h2>International transfers</h2>
            <p>PDFArrow and its providers may process information in the United States and other countries where they operate. Privacy protections may differ from those in your country. Where required, PDFArrow relies on provider contractual safeguards, recognized transfer frameworks, or another lawful transfer mechanism. Contact PDFArrow for available information about applicable safeguards.</p>
          </section>

          <section id="changes">
            <span className="privacy-section-number">13</span>
            <h2>Changes and contact</h2>
            <p>PDFArrow will update this policy when data practices, providers, or applicable requirements materially change. The effective date at the top identifies the current version. Material changes will be presented through an appropriate site or account notice before they take effect when required.</p>
            <p>For questions, access requests, deletion requests, appeals, or security concerns, use the <Link to={ROUTE_PATHS.support}>Support page</Link>. Choose “Privacy or data deletion” or “Security report” so the request is routed correctly.</p>
          </section>
        </article>
      </div>
    </main>
  );
}

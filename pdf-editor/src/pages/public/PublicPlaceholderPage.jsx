import { Link } from "react-router-dom";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { ROUTE_PATHS } from "../../router/routePaths.js";

const pageContent = {
  [ROUTE_PATHS.privacy]: {
    intro: "Effective July 20, 2026. A plain-language explanation of browser processing, optional cloud history, local storage, analytics, support, and deletion.",
    sections: [
      ["Browser processing", "The editor and supported merge, split, organize, rotate, page-removal, PDF-to-image, and image-to-PDF tools process supported files in your browser. Files are not sent to FixThatPDF merely to run these tools."],
      ["Optional Firebase account features", "Signing in uses Firebase Authentication. If Firebase Storage and Firestore are configured, account holders may store document history and document workspace data in Firebase for cross-device access. Guest processing does not require this cloud history."],
      ["Local browser storage", "Guest and signed-in work may be saved in local browser storage when space allows. Browser storage is limited and can be cleared by you, your browser, private-browsing rules, or device cleanup."],
      ["Product analytics", "FixThatPDF may record anonymous events such as a tool opening, broad file-size and page-count buckets, validation categories, and whether an export succeeded. It does not put file names, PDF contents, extracted text, document URLs, signatures, form values, or user-entered document data in analytics events."],
      ["Support requests", "If you contact support, FixThatPDF stores the name, reply email, category, message, account ID if signed in, and submission time in Firebase. Only the site owner can read the support inbox. Do not submit passwords or confidential PDF contents."],
      ["Service providers", <span key="providers">Vercel hosts the public web application, and Google Firebase provides optional authentication, Firestore, and Storage. Review the providers’ current policies at <a href="https://vercel.com/legal/privacy-notice" target="_blank" rel="noreferrer">Vercel Privacy</a> and <a href="https://firebase.google.com/support/privacy/" target="_blank" rel="noreferrer">Firebase Privacy and Security</a>.</span>],
      ["Deletion and your choices", "Guest documents can be removed by clearing this site's browser storage. Signed-in users can delete saved documents individually or permanently delete their account and associated document records, cloud payloads, account-linked analytics events, and account-linked support requests from Settings. Anonymous analytics cannot always be linked back to a person."],
      ["Current limitations", "Encrypted PDFs are not accepted by supported browser tools. The editor is limited to 8 MB and 100 pages. Browser memory, storage capacity, and device performance can affect larger or complex documents."],
    ],
  },
  [ROUTE_PATHS.security]: {
    intro: "FixThatPDF separates browser-only PDF work from optional account and cloud features, and avoids claiming safeguards that have not been verified.",
    sections: [
      ["Browser boundary", "Supported core processing runs in the current browser tab. This reduces unnecessary file transfer, but it is not a claim of end-to-end encryption, an external audit, or a compliance certification."],
      ["Account boundary", "Dashboard and cloud-history routes require authentication. Document records are scoped to their owner, and guest records remain tied to local browser storage."],
      ["What you should do", "Use a trusted device, keep your browser updated, verify every export, and avoid uploading a document when the shown tool or limit does not match your task."],
    ],
  },
  [ROUTE_PATHS.help]: {
    intro: "Quick guidance for completing a supported PDF task without an account.",
    sections: [
      ["Open a PDF", "Choose a valid, unencrypted PDF. The editor accepts files up to 8 MB and 100 pages. Dedicated page and conversion tools show their own higher limits."],
      ["Make and verify changes", "Use the focused controls for your tool. Original embedded text is not guaranteed to retain the exact font, spacing, or content stream, so review every changed page."],
      ["Download", "Use the editor or tool's download action. FixThatPDF does not add a watermark and does not require signup before a supported download."],
      ["If a file fails", "Try a fresh copy of a corrupted file, remove encryption with an authorized tool, use a smaller PDF, or switch to the dedicated page/conversion tool when it has a higher documented limit."],
    ],
  },
  [ROUTE_PATHS.terms]: {
    intro: "Effective July 20, 2026. Basic terms for the current free FixThatPDF public-beta service.",
    sections: [
      ["Permitted use", "Use FixThatPDF only with files you are authorized to view and modify, and do not use the service for unlawful activity."],
      ["Free service", "Supported FixThatPDF tools are currently free. There is no paid plan, checkout, watermark, or promised service level in this version."],
      ["Your responsibility", "You are responsible for reviewing exports, maintaining your own backups, and deciding whether the result is suitable for legal, financial, medical, filing, or other high-stakes use."],
      ["Availability", "Browser and optional cloud features may change or be unavailable. Planned tools do not accept or process files until they are implemented and tested."],
      ["Ownership", "You keep ownership of your files and edits. You give FixThatPDF only the limited permission needed to operate features you deliberately use, such as account authentication, cloud document history, analytics, or support."],
      ["Prohibited activity", "Do not probe or disrupt the service, bypass access controls, upload malware, infringe another person's rights, or use files you are not authorized to access or modify."],
      ["No professional advice", "FixThatPDF is a document tool, not legal, medical, financial, tax, or filing advice. Permanent redaction and other high-stakes outputs must be independently reviewed before use."],
      ["Account termination", "You may delete your account from Settings. FixThatPDF may restrict abusive or unlawful use needed to protect the service and other users."],
      ["Contact", "Questions about these terms, privacy, security, or data deletion can be submitted through the Support page."],
    ],
  },
  [ROUTE_PATHS.dataRetention]: {
    intro: "What FixThatPDF stores today, how long it remains, and the controls available to remove it.",
    sections: [
      ["PDF processing", "Supported browser tools process file content on your device. The service does not receive those PDF bytes merely to run the tool. Browser memory is released when the tab closes; local browser copies remain until you delete them or clear site data."],
      ["Account and cloud documents", "Firebase Authentication keeps the account until you delete it. Optional cloud document records and payloads remain until you delete the document or account. Account deletion attempts to remove both Firestore records and Firebase Storage payloads before removing the sign-in identity."],
      ["Product analytics", "Privacy-safe events omit file names and document contents. Signed-in account deletion removes events linked to that account ID. Anonymous events use a random browser visitor ID and cannot reliably be connected to a named person."],
      ["Support requests", "Support requests remain in the owner-only inbox until resolved and deleted. Account deletion removes requests linked to the signed-in account; requests submitted while signed out may require a separate deletion request from the same reply email."],
      ["Deletion limitations", "Browser storage, browser backups, Firebase operational backups, and previously downloaded PDFs may follow separate technical lifecycles. Deleting a FixThatPDF account cannot remove a file already downloaded to a device or shared elsewhere."],
      ["Request help", "Use the Support page and choose Privacy or data deletion if the self-service controls do not cover your situation."],
    ],
  },
  [ROUTE_PATHS.pricing]: {
    intro: "FixThatPDF is currently completely free.",
    sections: [["No plans or checkout", "Supported tools do not require a subscription, payment, email address, or account. Create an account only when you want cloud document history."]],
  },
};

export function PublicPlaceholderPage({ path, title, description, status }) {
  const content = pageContent[path];
  const noIndex = ![ROUTE_PATHS.privacy, ROUTE_PATHS.security, ROUTE_PATHS.help, ROUTE_PATHS.terms, ROUTE_PATHS.dataRetention].includes(path);
  return <main className="public-info-page">
    <PageMetadata title={`${title} | FixThatPDF`} description={content?.intro || description} canonicalUrl={path} noIndex={noIndex} />
    <section className="public-info-hero"><span className="route-status-pill">{content ? "FixThatPDF information" : status}</span><h1>{title}</h1><p>{content?.intro || description}</p><div><Link to={ROUTE_PATHS.tools}>Browse working tools</Link><Link to={ROUTE_PATHS.editPdf}>Choose a PDF</Link>{content && <Link to={ROUTE_PATHS.support}>Contact support</Link>}</div></section>
    {content ? <div className="public-info-sections">{content.sections.map(([heading, copy]) => <section key={heading}><h2>{heading}</h2><p>{copy}</p></section>)}</div> : <section className="route-state-card"><h2>Not part of the core public product today</h2><p>This route remains available for compatibility, but FixThatPDF does not present unfinished sales, enterprise, integration, or template features as working product capabilities.</p></section>}
  </main>;
}

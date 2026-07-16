import { Link } from "react-router-dom";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { ROUTE_PATHS } from "../../router/routePaths.js";

const pageContent = {
  [ROUTE_PATHS.privacy]: {
    intro: "A plain-language explanation of browser processing, optional cloud history, local storage, analytics, and deletion.",
    sections: [
      ["Browser processing", "The editor and supported merge, split, organize, rotate, page-removal, PDF-to-image, and image-to-PDF tools process supported files in your browser. Files are not sent to FixThatPDF merely to run these tools."],
      ["Optional Firebase account features", "Signing in uses Firebase Authentication. If Firebase Storage and Firestore are configured, account holders may store document history and document workspace data in Firebase for cross-device access. Guest processing does not require this cloud history."],
      ["Local browser storage", "Guest and signed-in work may be saved in local browser storage when space allows. Browser storage is limited and can be cleared by you, your browser, private-browsing rules, or device cleanup."],
      ["Product analytics", "FixThatPDF may record anonymous events such as a tool opening, broad file-size and page-count buckets, validation categories, and whether an export succeeded. It does not put file names, PDF contents, extracted text, document URLs, signatures, form values, or user-entered document data in analytics events."],
      ["Deletion", "Guest documents can be removed by clearing the site's browser storage. Account document deletion removes the document record and attempts to remove its Firebase payload when cloud persistence is configured. FixThatPDF does not claim an automatic deletion schedule that has not been implemented."],
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
    intro: "Basic terms for the current free FixThatPDF service.",
    sections: [
      ["Permitted use", "Use FixThatPDF only with files you are authorized to view and modify, and do not use the service for unlawful activity."],
      ["Free service", "Supported FixThatPDF tools are currently free. There is no paid plan, checkout, watermark, or promised service level in this version."],
      ["Your responsibility", "You are responsible for reviewing exports, maintaining your own backups, and deciding whether the result is suitable for legal, financial, medical, filing, or other high-stakes use."],
      ["Availability", "Browser and optional cloud features may change or be unavailable. Planned tools do not accept or process files until they are implemented and tested."],
    ],
  },
  [ROUTE_PATHS.pricing]: {
    intro: "FixThatPDF is currently completely free.",
    sections: [["No plans or checkout", "Supported tools do not require a subscription, payment, email address, or account. Create an account only when you want cloud document history."]],
  },
};

export function PublicPlaceholderPage({ path, title, description, status }) {
  const content = pageContent[path];
  const noIndex = ![ROUTE_PATHS.privacy, ROUTE_PATHS.security, ROUTE_PATHS.help, ROUTE_PATHS.terms].includes(path);
  return <main className="public-info-page">
    <PageMetadata title={`${title} | FixThatPDF`} description={content?.intro || description} canonicalUrl={path} noIndex={noIndex} />
    <section className="public-info-hero"><span className="route-status-pill">{content ? "FixThatPDF information" : status}</span><h1>{title}</h1><p>{content?.intro || description}</p><div><Link to={ROUTE_PATHS.tools}>Browse working tools</Link><Link to={ROUTE_PATHS.editPdf}>Choose a PDF</Link></div></section>
    {content ? <div className="public-info-sections">{content.sections.map(([heading, copy]) => <section key={heading}><h2>{heading}</h2><p>{copy}</p></section>)}</div> : <section className="route-state-card"><h2>Not part of the core public product today</h2><p>This route remains available for compatibility, but FixThatPDF does not present unfinished sales, enterprise, integration, or template features as working product capabilities.</p></section>}
  </main>;
}

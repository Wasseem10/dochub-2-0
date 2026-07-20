import { useEffect, useState } from "react";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import ExternalLink from "lucide-react/dist/esm/icons/external-link.mjs";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.mjs";
import Lock from "lucide-react/dist/esm/icons/lock.mjs";
import { Link, useParams } from "react-router-dom";
import { db, storage } from "../../firebase.js";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { loadSecurePdfShare } from "../../sharing/securePdfSharing.js";

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "PDF document";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB PDF`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB PDF`;
}

export function SecureSharePage() {
  const { token = "" } = useParams();
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    loadSecurePdfShare({ db, storage, token })
      .then((result) => {
        if (cancelled) return;
        if (result.status === "ready") {
          objectUrl = URL.createObjectURL(result.blob);
          setState({ ...result, objectUrl });
        } else {
          setState(result);
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token]);

  if (state.status === "loading") {
    return <main className="secure-share-page"><section className="secure-share-state"><LoaderCircle className="is-spinning" size={28} /><h1>Opening shared PDF</h1><p>Checking the link and loading the protected document.</p></section></main>;
  }

  if (state.status !== "ready") {
    const expired = state.status === "expired";
    return <main className="secure-share-page"><section className="secure-share-state"><Lock size={28} /><h1>{expired ? "This sharing link has expired" : "This sharing link cannot be opened"}</h1><p>{expired ? "Ask the document owner to create a new link." : "The link may be invalid, revoked, or no longer available."}</p><Link to={ROUTE_PATHS.home}>Go to FixThatPDF</Link></section></main>;
  }

  const downloadName = state.fileName;
  return (
    <main className="secure-share-page">
      <header className="secure-share-header">
        <div><span><FileText size={21} /></span><div><h1>{state.fileName}</h1><p>{formatBytes(state.size)} · Link expires {state.expiresAt.toLocaleDateString()}</p></div></div>
        <nav>
          <a href={state.objectUrl} target="_blank" rel="noreferrer"><ExternalLink size={17} /> Open</a>
          {state.allowDownload && <a className="is-primary" href={state.objectUrl} download={downloadName}><Download size={17} /> Download</a>}
        </nav>
      </header>
      <section className="secure-share-viewer" aria-label={`Preview of ${state.fileName}`}>
        <object data={state.objectUrl} type="application/pdf"><p>Your browser cannot preview this PDF. <a href={state.objectUrl} download={downloadName}>Download the file</a>.</p></object>
      </section>
      <footer className="secure-share-footer"><Lock size={14} /> Read-only sharing by FixThatPDF. The owner can revoke this link at any time.</footer>
    </main>
  );
}

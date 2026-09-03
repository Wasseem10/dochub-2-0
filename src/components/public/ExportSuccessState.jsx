import { ArrowRight, CheckCircle2, Download, RotateCcw, ThumbsDown, ThumbsUp, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { trackProductEvent } from "../../analytics/productAnalytics.js";
import { useAuth } from "../../auth/AuthContext.jsx";
import { ROUTE_PATHS } from "../../router/routePaths.js";

export function ExportSuccessState({ toolId, onDownloadAgain, onStartAnother, relatedRoute, relatedName }) {
  const { authReady, currentUser } = useAuth();

  return <section className="tool-export-success" aria-live="polite">
    <header>
      <span aria-hidden="true"><CheckCircle2 size={20} /></span>
      <div>
        <strong>Your file is ready</strong>
        <small>Saved successfully and ready to download.</small>
      </div>
    </header>
    <div className="tool-export-actions">
      <button className="is-primary" type="button" onClick={onDownloadAgain}><Download size={16} /> Download again</button>
      <button type="button" onClick={onStartAnother}><RotateCcw size={16} /> Start another</button>
    </div>
    <Link className="tool-export-related" to={relatedRoute}>Continue with {relatedName}<ArrowRight size={15} /></Link>
    {authReady && !currentUser && <aside className="tool-export-account-prompt">
      <UserPlus size={18} aria-hidden="true" />
      <div>
        <strong>Keep future finished PDFs across devices</strong>
        <small>Create a free account. PDFs you open while signed in are added to your private document list.</small>
      </div>
      <Link
        to={ROUTE_PATHS.signup}
        state={{ from: { pathname: ROUTE_PATHS.dashboard } }}
        onClick={() => trackProductEvent("signup_prompt_clicked", { toolId })}
      >Create free account <ArrowRight size={14} /></Link>
    </aside>}
    <footer>
      <small>Did PDFEnrich complete your task?</small>
      <span>
        <button type="button" aria-label="Yes, PDFEnrich completed my task" onClick={() => trackProductEvent("task_feedback_submitted", { toolId, result: "yes" })}><ThumbsUp size={14} /> Yes</button>
        <button type="button" aria-label="No, PDFEnrich did not complete my task" onClick={() => trackProductEvent("task_feedback_submitted", { toolId, result: "not_quite" })}><ThumbsDown size={14} /> Not quite</button>
      </span>
    </footer>
  </section>;
}

import { ArrowRight, CheckCircle2, Download, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import { Link } from "react-router-dom";
import { trackProductEvent } from "../../analytics/productAnalytics.js";

export function ExportSuccessState({ toolId, onDownloadAgain, onStartAnother, relatedRoute, relatedName }) {
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
    <footer>
      <small>Did PDFArrow complete your task?</small>
      <span>
        <button type="button" aria-label="Yes, PDFArrow completed my task" onClick={() => trackProductEvent("task_feedback_submitted", { toolId, result: "yes" })}><ThumbsUp size={14} /> Yes</button>
        <button type="button" aria-label="No, PDFArrow did not complete my task" onClick={() => trackProductEvent("task_feedback_submitted", { toolId, result: "not_quite" })}><ThumbsDown size={14} /> Not quite</button>
      </span>
    </footer>
  </section>;
}

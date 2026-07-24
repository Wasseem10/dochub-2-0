import { Link } from "react-router-dom";
import { trackProductEvent } from "../../analytics/productAnalytics.js";

export function ExportSuccessState({ toolId, onDownloadAgain, onStartAnother, relatedRoute, relatedName }) {
  return <section className="tool-export-success" aria-live="polite"><strong>Your file is ready.</strong><div><button type="button" onClick={onDownloadAgain}>Download again</button><button type="button" onClick={onStartAnother}>Start another file</button><Link to={relatedRoute}>Open {relatedName}</Link></div><small>Did PDFArrow complete your task?</small><span><button type="button" onClick={() => trackProductEvent("task_feedback_submitted", { toolId, result: "yes" })}>Yes</button><button type="button" onClick={() => trackProductEvent("task_feedback_submitted", { toolId, result: "not_quite" })}>Not quite</button></span></section>;
}

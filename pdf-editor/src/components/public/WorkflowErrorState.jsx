import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle.mjs";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import X from "lucide-react/dist/esm/icons/x.mjs";

export function workflowErrorTitle(message = "") {
  const normalized = String(message).toLowerCase();
  if (normalized.includes("password") || normalized.includes("encrypted") || normalized.includes("locked")) return "This PDF is locked";
  if (normalized.includes("invalid pdf") || normalized.includes("corrupt") || normalized.includes("incomplete") || normalized.includes("could not be read") || normalized.includes("could not be opened")) return "We couldn’t read this file";
  if (normalized.includes("too many") || normalized.includes("no more than") || normalized.includes("larger than") || normalized.includes("must be under") || normalized.includes("exceeds") || normalized.includes("supports up to")) return "This file exceeds the limit";
  if (normalized.includes("skipped")) return "Some files were skipped";
  if (normalized.includes("no readable") || normalized.includes("no embedded") || normalized.includes("none of these")) return "The result needs attention";
  return "This task couldn’t finish";
}

export function WorkflowErrorState({
  message,
  title,
  onRetry,
  onDismiss,
  showChooseAnother = true,
}) {
  if (!message) return null;

  const chooseAnother = (event) => {
    const root = event.currentTarget.closest(".conversion-workspace-grid") || event.currentTarget.closest("main") || document;
    const input = root.querySelector?.('input[type="file"]');
    onDismiss?.();
    if (input && !input.disabled) input.click();
  };

  return (
    <section className="workflow-error-state" role="alert" aria-live="assertive">
      <span className="workflow-error-icon" aria-hidden="true"><AlertTriangle size={20} /></span>
      <div className="workflow-error-copy">
        <strong>{title || workflowErrorTitle(message)}</strong>
        <p>{message}</p>
        <small>Your current ready files stay in place unless you replace them.</small>
      </div>
      <div className="workflow-error-actions">
        {onRetry && <button className="is-primary" type="button" onClick={onRetry}><RefreshCw size={15} /> Try again</button>}
        {showChooseAnother && <button type="button" onClick={chooseAnother}><Upload size={15} /> Choose another file</button>}
        {onDismiss && <button className="is-icon" type="button" aria-label="Dismiss error" onClick={onDismiss}><X size={16} /></button>}
      </div>
    </section>
  );
}

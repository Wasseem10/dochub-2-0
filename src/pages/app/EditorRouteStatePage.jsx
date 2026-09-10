import { ArrowRight, ShieldCheck, WarningCircle } from "@phosphor-icons/react";
import { BrandWordmark } from "../../components/public/BrandWordmark.jsx";
import { AuthLoadingScreen } from "../auth/AuthLoadingScreen.jsx";

const recoveryCopy = {
  unauthorized: "We couldn’t verify access to this saved document. Try again, or return to Documents and choose another copy.",
  error: "We couldn’t finish loading this saved document. Try again, or return to Documents and choose another copy.",
  "not-found": "This saved document is no longer available here. Try again, or return to Documents and choose another copy.",
};

export function EditorRouteStatePage({
  state,
  onRetry,
  onBack,
  backLabel = "Back to Documents",
  onHome,
}) {
  const isLoading = state === "idle" || state === "loading";
  if (isLoading) return <AuthLoadingScreen label="Opening your document" />;

  const message = recoveryCopy[state] || recoveryCopy.error;

  return (
    <main className="editor-recovery-page">
      <header className="editor-recovery-header">
        <button type="button" onClick={onHome || onBack} aria-label="Go to PDFEnrich home">
          <BrandWordmark className="editor-recovery-wordmark" logo />
        </button>
      </header>

      <section
        className="editor-recovery-layout"
        aria-live="polite"
        role="alert"
        aria-describedby="editor-recovery-description"
      >
        <div className="editor-recovery-copy">
          <h1>We couldn’t open this document.</h1>
          <p id="editor-recovery-description">{message}</p>

            <div className="editor-recovery-actions">
              <button className="editor-recovery-primary" type="button" onClick={onRetry}>
                Try again
              </button>
              <button className="editor-recovery-secondary" type="button" onClick={onBack}>
                {backLabel}
              </button>
              <button className="editor-recovery-home" type="button" onClick={onHome || onBack}>
                PDFEnrich home
                <ArrowRight size={20} weight="regular" aria-hidden="true" />
              </button>
            </div>

          <p className="editor-recovery-reassurance">
            <span aria-hidden="true"><ShieldCheck size={22} weight="regular" /></span>
            This failed attempt did not change your PDF.
          </p>
        </div>

        <div className="editor-recovery-visual" aria-hidden="true">
          <div className="editor-recovery-visual-status">
            <WarningCircle size={27} weight="fill" />
            <span>Opening was interrupted</span>
          </div>
          <img
            src="/error-state/editor-open-recovery.png"
            alt=""
            width="1024"
            height="1024"
          />
        </div>
      </section>
    </main>
  );
}

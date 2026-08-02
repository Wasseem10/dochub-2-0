export function EditorRouteStatePage({ state, onBack, backLabel = "Back to documents", onHome }) {
  const isDesignPreview = import.meta.env.DEV
    && typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("preview") === "document-opening";
  const isLoading = state === "idle" || state === "loading" || isDesignPreview;
  if (isLoading) {
    return (
      <main className="document-opening-shell" data-testid="editor-route-loading">
        <div className="document-opening-editor" aria-hidden="true">
          <header className="document-opening-header">
            <span className="document-opening-brand-mark">
              <img src="/pdfenrich-logo.png" alt="" />
            </span>
            <span className="document-opening-file-line" />
            <span className="document-opening-header-actions">
              <i />
              <i />
              <i />
              <b />
            </span>
          </header>

          <aside className="document-opening-sidebar">
            <span className="document-opening-thumbnail" />
            <span className="document-opening-page-dot" />
          </aside>

          <section className="document-opening-workspace">
            <div className="document-opening-toolbar">
              {Array.from({ length: 16 }, (_, index) => <span key={index}><i /><b /></span>)}
            </div>
            <div className="document-opening-settings">
              {Array.from({ length: 10 }, (_, index) => <i key={index} />)}
            </div>
            <div className="document-opening-page">
              <div className="document-opening-indicator">
                <span className="document-opening-mark">
                  <img src="/pdfenrich-logo.png" alt="" />
                </span>
                <span className="document-opening-progress">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>
          </section>
        </div>

        <span className="sr-only" role="status" aria-live="polite">
          Opening your document
        </span>
      </main>
    );
  }

  const title = state === "unauthorized"
    ? "You do not have access to this document"
    : state === "error"
      ? "Document could not be opened"
      : "Document not found";
  const message = "The document may have been removed, belongs to another account, or is not available in this workspace.";

  return (
    <main className="route-state-page">
      <section className="route-state-card" aria-live="polite">
        <span className="route-status-pill">Editor unavailable</span>
        <h1>{title}</h1>
        <p>{message}</p>
        <div className="route-state-actions"><button type="button" onClick={onBack}>{backLabel}</button>{onHome && <button type="button" onClick={onHome}>PDFEnrich home</button>}</div>
      </section>
    </main>
  );
}

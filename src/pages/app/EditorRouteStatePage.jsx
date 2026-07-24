export function EditorRouteStatePage({ state, onBack, backLabel = "Back to documents", onHome }) {
  const isLoading = state === "idle" || state === "loading";
  const title = isLoading
    ? "Opening document"
    : state === "unauthorized"
      ? "You do not have access to this document"
      : state === "error"
        ? "Document could not be opened"
        : "Document not found";
  const message = isLoading
    ? "Loading the saved document and restoring the editor."
    : "The document may have been removed, belongs to another account, or is not available in this workspace.";

  return (
    <main className="route-state-page">
      <section className="route-state-card" aria-live="polite">
        <span className="route-status-pill">{isLoading ? "Loading" : "Editor unavailable"}</span>
        <h1>{title}</h1>
        <p>{message}</p>
        {!isLoading && <div className="route-state-actions"><button type="button" onClick={onBack}>{backLabel}</button>{onHome && <button type="button" onClick={onHome}>PDFArrow home</button>}</div>}
      </section>
    </main>
  );
}

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ROUTE_PATHS } from "../../router/routePaths.js";

export function PublicPlaceholderPage({ title, description, status }) {
  useEffect(() => {
    if (typeof document !== "undefined") document.title = `${title} | RealPDF`;
  }, [title]);

  return (
    <main className="route-state-page public-placeholder-page">
      <section className="route-state-card">
        <span className="route-status-pill">{status}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="route-state-actions">
          <Link to={ROUTE_PATHS.home}>Back to homepage</Link>
          <Link className="is-secondary" to={ROUTE_PATHS.editPdf}>Edit a PDF</Link>
        </div>
      </section>
    </main>
  );
}

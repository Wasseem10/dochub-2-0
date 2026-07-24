import { Link, useParams } from "react-router-dom";
import { ROUTE_PATHS } from "../../router/routePaths.js";

export function WorkflowUnavailablePage({ kind }) {
  const { token } = useParams();
  return (
    <main className="route-state-page">
      <section className="route-state-card" aria-labelledby="workflow-unavailable-title">
        <span className="route-status-pill">Secure {kind} unavailable</span>
        <h1 id="workflow-unavailable-title">This {kind} link cannot be opened</h1>
        <p>PDFArrow does not expose documents through client-generated links. This link is invalid, expired, or waiting for the secure token service planned for a later backend milestone.</p>
        <small>Reference: {token || "missing token"}</small>
        <div className="route-state-actions"><Link to={ROUTE_PATHS.home}>Go to homepage</Link></div>
      </section>
    </main>
  );
}

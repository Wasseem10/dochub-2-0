import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { ROUTE_PATHS } from "./routePaths.js";

export function RouteErrorBoundary() {
  const error = useRouteError();
  const detail = import.meta.env.DEV
    ? (isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error?.message)
    : "Please return to a safe page and try again.";

  return (
    <main className="route-state-page">
      <section className="route-state-card" role="alert">
        <span className="route-status-pill">RealPDF</span>
        <h1>Something went wrong</h1>
        <p>We could not render this page.</p>
        {detail && <pre className="route-error-detail">{detail}</pre>}
        <div className="route-state-actions"><Link to={ROUTE_PATHS.home}>Go to homepage</Link></div>
      </section>
    </main>
  );
}

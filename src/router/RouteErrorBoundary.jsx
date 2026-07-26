import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { ROUTE_PATHS } from "./routePaths.js";

export function RouteErrorBoundary() {
  const error = useRouteError();
  const technicalDetail = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error?.message;
  const isLoadingFailure = /chunk|dynamically imported|failed to fetch|network/i.test(String(technicalDetail || ""));
  const title = isLoadingFailure ? "This page did not finish loading" : "We could not open this page";
  const description = isLoadingFailure
    ? "Your document was not changed. Check your connection, then try loading the page again."
    : "Your document was not changed. Try again, or return to the PDF tools directory.";

  return (
    <main className="route-state-page">
      <section className="route-state-card" role="alert" aria-describedby="route-error-description">
        <span className="route-status-pill">PDFArrow</span>
        <h1>{title}</h1>
        <p id="route-error-description">{description}</p>
        {import.meta.env.DEV && technicalDetail && <pre className="route-error-detail">{technicalDetail}</pre>}
        <div className="route-state-actions">
          <button type="button" onClick={() => window.location.reload()}>Try again</button>
          <Link className="is-secondary" to={ROUTE_PATHS.tools}>Browse PDF tools</Link>
          <Link className="is-secondary" to={ROUTE_PATHS.home}>Go to homepage</Link>
        </div>
      </section>
    </main>
  );
}

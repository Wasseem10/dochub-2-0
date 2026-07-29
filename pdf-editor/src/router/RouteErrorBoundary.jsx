import { Circle } from "lucide-react";
import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { BrandWordmark } from "../components/public/BrandWordmark.jsx";
import { ROUTE_PATHS } from "./routePaths.js";

export function RouteErrorView({ isLoadingFailure = true, technicalDetail = "" }) {
  return (
    <main className="route-state-page">
      <header className="route-state-header">
        <Link to={ROUTE_PATHS.home} aria-label="PDFEnrich homepage">
          <BrandWordmark className="route-state-wordmark" logo />
        </Link>
      </header>

      <section className="route-state-editorial" role="alert" aria-describedby="route-error-description">
        <div className="route-state-copy">
          <span className="route-status-label">
            <Circle size={13} fill="currentColor" strokeWidth={0} aria-hidden="true" />
            {isLoadingFailure ? "Connection interrupted" : "Page unavailable"}
          </span>
          <h1>The page paused.<br />Your PDF didn&rsquo;t.</h1>
          <p id="route-error-description">
            Nothing changed in your document.<br />
            Reload this page to continue.
          </p>

          <div className="route-state-actions">
            <button type="button" onClick={() => window.location.reload()}>Reload page</button>
            <Link to={ROUTE_PATHS.tools}>PDF tools</Link>
            <Link to={ROUTE_PATHS.home}>Home</Link>
          </div>

          {import.meta.env.DEV && technicalDetail ? (
            <details className="route-error-detail">
              <summary>Technical details</summary>
              <pre>{technicalDetail}</pre>
            </details>
          ) : null}
        </div>

        <div className="route-state-visual" aria-hidden="true">
          <img
            src="/error-state/quiet-editorial-recovery.png"
            alt=""
            width="903"
            height="550"
          />
        </div>
      </section>
    </main>
  );
}

export function RouteErrorBoundary() {
  const error = useRouteError();
  const technicalDetail = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error?.message;
  const isLoadingFailure = /chunk|dynamically imported|failed to fetch|network/i.test(String(technicalDetail || ""));

  return <RouteErrorView isLoadingFailure={isLoadingFailure} technicalDetail={technicalDetail} />;
}

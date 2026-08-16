import { useEffect } from "react";
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

  useEffect(() => {
    if (!isLoadingFailure || typeof window === "undefined") return undefined;
    const recoveryKey = "pdfenrich.chunk-recovery.v1";
    const now = Date.now();
    try {
      const lastRecovery = Number(window.sessionStorage.getItem(recoveryKey) || 0);
      if (now - lastRecovery < 60_000) return undefined;
      window.sessionStorage.setItem(recoveryKey, String(now));
    } catch {
      // A blocked session store should not prevent the visible recovery screen.
      return undefined;
    }

    const timer = window.setTimeout(() => window.location.reload(), 200);
    return () => window.clearTimeout(timer);
  }, [isLoadingFailure]);

  return <RouteErrorView isLoadingFailure={isLoadingFailure} technicalDetail={technicalDetail} />;
}

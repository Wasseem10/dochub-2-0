import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.jsx";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { ROUTE_PATHS } from "../../router/routePaths.js";

export function NotFoundPage() {
  const { currentUser } = useAuth();
  const { pathname } = useLocation();
  return (
    <main className="route-state-page">
      <PageMetadata title="Page Not Found | FixThatPDF" description="The requested FixThatPDF page could not be found." canonicalUrl={pathname} noIndex />
      <section className="route-state-card">
        <span className="route-status-pill">404</span>
        <h1>Page not found</h1>
        <p>The page may have moved, or the address may be incomplete.</p>
        <div className="route-state-actions">
          <Link to={ROUTE_PATHS.home}>Go to homepage</Link>
          {currentUser && <Link className="is-secondary" to={ROUTE_PATHS.dashboard}>Go to dashboard</Link>}
        </div>
      </section>
    </main>
  );
}

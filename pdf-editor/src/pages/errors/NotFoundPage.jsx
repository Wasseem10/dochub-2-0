import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.jsx";
import { ROUTE_PATHS } from "../../router/routePaths.js";

export function NotFoundPage() {
  const { currentUser } = useAuth();
  return (
    <main className="route-state-page">
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

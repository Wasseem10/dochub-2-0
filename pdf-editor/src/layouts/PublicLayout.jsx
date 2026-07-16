import { Outlet, useLocation } from "react-router-dom";
import { MarketingFooter } from "../components/public/MarketingFooter.jsx";
import { MarketingHeader } from "../components/public/MarketingHeader.jsx";
import { ROUTE_PATHS } from "../router/routePaths.js";

export function PublicLayout() {
  const { pathname } = useLocation();
  const usesExistingLandingChrome = pathname === ROUTE_PATHS.home;

  if (usesExistingLandingChrome) return <Outlet />;

  return (
    <div className="public-route-shell">
      <MarketingHeader />
      <Outlet />
      <MarketingFooter />
    </div>
  );
}

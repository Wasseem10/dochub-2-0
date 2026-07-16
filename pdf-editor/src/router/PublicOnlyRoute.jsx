import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { AuthLoadingScreen } from "../pages/auth/AuthLoadingScreen.jsx";
import { ROUTE_PATHS } from "./routePaths.js";

function safeReturnPath(location) {
  const from = location.state?.from;
  if (!from?.pathname?.startsWith("/app/")) return ROUTE_PATHS.dashboard;
  return `${from.pathname}${from.search || ""}${from.hash || ""}`;
}

export function PublicOnlyRoute() {
  const { authReady, currentUser } = useAuth();
  const location = useLocation();

  if (!authReady) return <AuthLoadingScreen />;
  if (currentUser) return <Navigate to={safeReturnPath(location)} replace />;
  return <Outlet />;
}

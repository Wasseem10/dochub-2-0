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
  // Keep an in-editor sign-in mounted until App completes the guest-document
  // claim and original cloud action. This prevents an auth-state update from
  // racing the handoff and briefly opening a second editor instance.
  if (currentUser && location.state?.guestDocumentId) return <Outlet />;
  if (currentUser) return <Navigate to={safeReturnPath(location)} replace />;
  return <Outlet />;
}

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { isAnalyticsOwner } from "../config/adminAccess.js";
import { AuthLoadingScreen } from "../pages/auth/AuthLoadingScreen.jsx";
import { ROUTE_PATHS } from "./routePaths.js";

export function OwnerRoute() {
  const { authReady, currentUser } = useAuth();

  if (!authReady) return <AuthLoadingScreen label="Opening analytics" />;
  if (!isAnalyticsOwner(currentUser)) return <Navigate to={ROUTE_PATHS.dashboard} replace />;
  return <Outlet />;
}

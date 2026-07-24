import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { AuthLoadingScreen } from "../pages/auth/AuthLoadingScreen.jsx";
import { ROUTE_PATHS } from "./routePaths.js";

export function ProtectedRoute() {
  const { authReady, currentUser } = useAuth();
  const location = useLocation();

  if (!authReady) return <AuthLoadingScreen />;
  if (!currentUser) {
    return <Navigate to={ROUTE_PATHS.login} replace state={{ from: location }} />;
  }
  return <Outlet />;
}

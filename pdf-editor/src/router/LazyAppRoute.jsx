import { lazy, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { AuthLoadingScreen } from "../pages/auth/AuthLoadingScreen.jsx";

const LazyApp = lazy(() => import("../App.jsx").then((module) => ({ default: module.App })));
const LazyFirebaseAuthProvider = lazy(() => import("../auth/FirebaseAuthProvider.jsx"));

function LoadingBoundary({ children }) {
  return <Suspense fallback={<AuthLoadingScreen label="Opening FixThatPDF" />}>{children}</Suspense>;
}

export function LazyAppContent(props) {
  return <LoadingBoundary><LazyApp {...props} /></LoadingBoundary>;
}

export function LazyPublicAppRoute(props) {
  return (
    <LoadingBoundary>
      <LazyFirebaseAuthProvider><LazyApp {...props} /></LazyFirebaseAuthProvider>
    </LoadingBoundary>
  );
}

export function LazyGuestAppRoute(props) {
  return (
    <LoadingBoundary>
      <LazyFirebaseAuthProvider><LazyApp {...props} /></LazyFirebaseAuthProvider>
    </LoadingBoundary>
  );
}

export function LazyAuthRouteProvider() {
  return (
    <LoadingBoundary>
      <LazyFirebaseAuthProvider><Outlet /></LazyFirebaseAuthProvider>
    </LoadingBoundary>
  );
}

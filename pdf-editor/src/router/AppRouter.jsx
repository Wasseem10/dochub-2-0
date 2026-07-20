import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider, useParams, useSearchParams } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { AuthLayout } from "../layouts/AuthLayout.jsx";
import { PublicLayout } from "../layouts/PublicLayout.jsx";
import { NotFoundPage } from "../pages/errors/NotFoundPage.jsx";
import { HomePage } from "../pages/public/HomePage.jsx";
import { WorkflowUnavailablePage } from "../pages/public/WorkflowUnavailablePage.jsx";
import { TOOL_REGISTRY } from "../tools/toolRegistry.js";
import { getEditorToolPreset } from "../tools/editorToolPresets.js";
import { LazyAppContent, LazyAuthRouteProvider, LazyPublicAppRoute } from "./LazyAppRoute.jsx";
import { OwnerRoute } from "./OwnerRoute.jsx";
import { ProtectedRoute } from "./ProtectedRoute.jsx";
import { PublicOnlyRoute } from "./PublicOnlyRoute.jsx";
import { RouteErrorBoundary } from "./RouteErrorBoundary.jsx";
import { APP_ROUTE_SECTIONS, PUBLIC_PLACEHOLDER_ROUTES } from "./routes.js";
import { ROUTE_PATHS } from "./routePaths.js";

const LazyPublicPlaceholderPage = lazy(() => import("../pages/public/PublicPlaceholderPage.jsx").then((module) => ({ default: module.PublicPlaceholderPage })));
const LazyToolDirectoryPage = lazy(() => import("../pages/public/ToolDirectoryPage.jsx").then((module) => ({ default: module.ToolDirectoryPage })));
const LazyImageConversionPage = lazy(() => import("../pages/public/ImageConversionPage.jsx").then((module) => ({ default: module.ImageConversionPage })));
const LazyPdfPageToolPage = lazy(() => import("../pages/public/PdfPageToolPage.jsx").then((module) => ({ default: module.PdfPageToolPage })));
const LazyToolLandingPage = lazy(() => import("../pages/public/ToolLandingPage.jsx").then((module) => ({ default: module.ToolLandingPage })));

function PublicRouteBoundary({ children }) {
  return <Suspense fallback={<main className="public-route-loading" aria-live="polite">Opening free PDF tool…</main>}>{children}</Suspense>;
}

export function EditorRoute() {
  const { documentId } = useParams();
  return <LazyAppContent view="editor" documentId={documentId} />;
}

export function PublicEditorRoute() {
  const [searchParams] = useSearchParams();
  const requestedTool = searchParams.get("tool") || "edit-pdf";
  const publicTool = getEditorToolPreset(requestedTool) ? requestedTool : "edit-pdf";
  return <LazyPublicAppRoute view="landing" publicTool={publicTool} pendingUploadToken={searchParams.get("pending") || ""} />;
}

const publicPlaceholderRouteObjects = PUBLIC_PLACEHOLDER_ROUTES.map((route) => ({
  path: route.path,
  element: <PublicRouteBoundary><LazyPublicPlaceholderPage {...route} /></PublicRouteBoundary>,
}));

const toolRouteObjects = TOOL_REGISTRY
  .filter((tool) => tool.route !== ROUTE_PATHS.editPdf)
  .map((tool) => ({
    path: tool.route,
    element: tool.workflowType === "converter"
      ? <PublicRouteBoundary><LazyImageConversionPage tool={tool} /></PublicRouteBoundary>
      : tool.workflowType === "page-tool"
        ? <PublicRouteBoundary><LazyPdfPageToolPage tool={tool} /></PublicRouteBoundary>
        : <PublicRouteBoundary><LazyToolLandingPage tool={tool} /></PublicRouteBoundary>,
  }));

const appScreenRouteObjects = Object.entries(APP_ROUTE_SECTIONS).map(([path, appSection]) => ({
  path,
  element: <LazyAppContent view="dashboard" appSection={appSection} />,
})).filter(({ path }) => path !== ROUTE_PATHS.analytics);

export const appRouteObjects = [
  {
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: ROUTE_PATHS.home, element: <HomePage /> },
          { path: ROUTE_PATHS.editPdf, element: <PublicEditorRoute /> },
          { path: ROUTE_PATHS.tools, element: <PublicRouteBoundary><LazyToolDirectoryPage /></PublicRouteBoundary> },
          ...publicPlaceholderRouteObjects,
          ...toolRouteObjects,
        ],
      },
      {
        element: <LazyAuthRouteProvider />,
        children: [
          {
            element: <PublicOnlyRoute />,
            children: [
              {
                element: <AuthLayout />,
                children: [
                  { path: ROUTE_PATHS.login, element: <LazyAppContent view="auth" authMode="login" /> },
                  { path: ROUTE_PATHS.signup, element: <LazyAppContent view="auth" authMode="signup" /> },
                ],
              },
            ],
          },
          {
            element: <AuthLayout />,
            children: [
              { path: ROUTE_PATHS.forgotPassword, element: <LazyAppContent view="auth" authMode="forgot-password" /> },
            ],
          },
          {
            element: <ProtectedRoute />,
            children: [
              {
                element: <AppLayout />,
                children: [
                  ...appScreenRouteObjects,
                  {
                    element: <OwnerRoute />,
                    children: [
                      { path: ROUTE_PATHS.analytics, element: <LazyAppContent view="dashboard" appSection="Analytics" /> },
                    ],
                  },
                  { path: ROUTE_PATHS.editorPattern, element: <EditorRoute /> },
                ],
              },
            ],
          },
        ],
      },
      { path: ROUTE_PATHS.sharePattern, element: <WorkflowUnavailablePage kind="share" /> },
      { path: ROUTE_PATHS.signPattern, element: <WorkflowUnavailablePage kind="signing" /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export function createRealPdfRouter() {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const basename = baseUrl === "/" ? undefined : baseUrl.replace(/\/$/, "");
  return createBrowserRouter(appRouteObjects, { basename });
}

const browserRouter = createRealPdfRouter();

export function AppRouter() {
  return <RouterProvider router={browserRouter} />;
}

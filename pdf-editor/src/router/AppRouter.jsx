import { createBrowserRouter, RouterProvider, useParams, useSearchParams } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { AuthLayout } from "../layouts/AuthLayout.jsx";
import { PublicLayout } from "../layouts/PublicLayout.jsx";
import { NotFoundPage } from "../pages/errors/NotFoundPage.jsx";
import { PublicPlaceholderPage } from "../pages/public/PublicPlaceholderPage.jsx";
import { ToolDirectoryPage } from "../pages/public/ToolDirectoryPage.jsx";
import { ImageConversionPage } from "../pages/public/ImageConversionPage.jsx";
import { PdfPageToolPage } from "../pages/public/PdfPageToolPage.jsx";
import { ToolLandingPage } from "../pages/public/ToolLandingPage.jsx";
import { WorkflowUnavailablePage } from "../pages/public/WorkflowUnavailablePage.jsx";
import { TOOL_REGISTRY } from "../tools/toolRegistry.js";
import { getEditorToolPreset } from "../tools/editorToolPresets.js";
import { LazyAppContent, LazyAuthRouteProvider, LazyGuestAppRoute, LazyPublicAppRoute } from "./LazyAppRoute.jsx";
import { ProtectedRoute } from "./ProtectedRoute.jsx";
import { PublicOnlyRoute } from "./PublicOnlyRoute.jsx";
import { RouteErrorBoundary } from "./RouteErrorBoundary.jsx";
import { APP_ROUTE_SECTIONS, PUBLIC_PLACEHOLDER_ROUTES } from "./routes.js";
import { ROUTE_PATHS } from "./routePaths.js";

export function EditorRoute() {
  const { documentId } = useParams();
  return <LazyAppContent view="editor" documentId={documentId} />;
}

export function PublicEditorRoute() {
  const [searchParams] = useSearchParams();
  const requestedTool = searchParams.get("tool") || "edit-pdf";
  const publicTool = getEditorToolPreset(requestedTool) ? requestedTool : "edit-pdf";
  const documentId = searchParams.get("document") || "";
  return <LazyGuestAppRoute view={documentId ? "public-editor" : "tool-upload"} publicTool={publicTool} documentId={documentId} />;
}

const publicPlaceholderRouteObjects = PUBLIC_PLACEHOLDER_ROUTES.map((route) => ({
  path: route.path,
  element: <PublicPlaceholderPage {...route} />,
}));

const toolRouteObjects = TOOL_REGISTRY
  .filter((tool) => tool.route !== ROUTE_PATHS.editPdf)
  .map((tool) => ({
    path: tool.route,
    element: tool.workflowType === "converter"
      ? <ImageConversionPage tool={tool} />
      : tool.workflowType === "page-tool"
        ? <PdfPageToolPage tool={tool} />
        : tool.workflowType === "editor"
          ? <LazyGuestAppRoute view="tool-upload" publicTool={tool.id} />
        : <ToolLandingPage tool={tool} />,
  }));

const appScreenRouteObjects = Object.entries(APP_ROUTE_SECTIONS).map(([path, appSection]) => ({
  path,
  element: <LazyAppContent view="dashboard" appSection={appSection} />,
}));

export const appRouteObjects = [
  {
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: ROUTE_PATHS.home, element: <LazyPublicAppRoute view="landing" /> },
          { path: ROUTE_PATHS.editPdf, element: <PublicEditorRoute /> },
          { path: ROUTE_PATHS.tools, element: <ToolDirectoryPage /> },
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

import { createBrowserRouter, RouterProvider, useParams, useSearchParams } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { AuthLayout } from "../layouts/AuthLayout.jsx";
import { PublicLayout } from "../layouts/PublicLayout.jsx";
import { NotFoundPage } from "../pages/errors/NotFoundPage.jsx";
import { PublicPlaceholderPage } from "../pages/public/PublicPlaceholderPage.jsx";
import { ComparePdfPage } from "../pages/public/ComparePdfPage.jsx";
import { ToolDirectoryPage } from "../pages/public/ToolDirectoryPage.jsx";
import { ImageConversionPage } from "../pages/public/ImageConversionPage.jsx";
import { OfficeConversionPage } from "../pages/public/OfficeConversionPage.jsx";
import { OcrPdfPage } from "../pages/public/OcrPdfPage.jsx";
import { OpenDocumentConversionPage } from "../pages/public/OpenDocumentConversionPage.jsx";
import { PdfPageToolPage } from "../pages/public/PdfPageToolPage.jsx";
import { PdfProtectionPage } from "../pages/public/PdfProtectionPage.jsx";
import { RedactPdfPage } from "../pages/public/RedactPdfPage.jsx";
import { SecureSharePage } from "../pages/public/SecureSharePage.jsx";
import { ScanPdfPage } from "../pages/public/ScanPdfPage.jsx";
import { StructuredPdfConversionPage } from "../pages/public/StructuredPdfConversionPage.jsx";
import { SupportPage } from "../pages/public/SupportPage.jsx";
import { ToolLandingPage } from "../pages/public/ToolLandingPage.jsx";
import { TextConversionPage } from "../pages/public/TextConversionPage.jsx";
import { ToPdfConversionPage } from "../pages/public/ToPdfConversionPage.jsx";
import { WorkflowUnavailablePage } from "../pages/public/WorkflowUnavailablePage.jsx";
import { TOOL_REGISTRY } from "../tools/toolRegistry.js";
import { getEditorToolPreset } from "../tools/editorToolPresets.js";
import { LazyAppContent, LazyAuthRouteProvider, LazyGuestAppRoute, LazyPublicAppRoute } from "./LazyAppRoute.jsx";
import { OwnerRoute } from "./OwnerRoute.jsx";
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
    element: tool.id === "redact-pdf"
      ? <RedactPdfPage tool={tool} />
      : ["unlock-pdf", "flatten-pdf", "remove-pdf-password"].includes(tool.id)
        ? <PdfProtectionPage tool={tool} />
      : ["pdf-scanner", "scan-to-pdf", "image-to-searchable-pdf"].includes(tool.id)
        ? <ScanPdfPage tool={tool} />
      : ["rtf-to-pdf", "odt-to-pdf", "odp-to-pdf", "ods-to-pdf", "epub-to-pdf", "zip-to-pdf"].includes(tool.id)
        ? <OpenDocumentConversionPage tool={tool} />
      : ["compare-pdf", "document-version-comparison"].includes(tool.id)
        ? <ComparePdfPage tool={tool} />
      : tool.id === "ocr-pdf"
        ? <OcrPdfPage tool={tool} />
      : tool.workflowType === "converter"
      ? ["pdf-to-excel", "pdf-to-powerpoint", "pdf-to-html"].includes(tool.id)
        ? <StructuredPdfConversionPage tool={tool} />
        : ["excel-to-pdf", "powerpoint-to-pdf", "html-to-pdf"].includes(tool.id)
          ? <ToPdfConversionPage tool={tool} />
        : ["pdf-to-txt", "txt-to-pdf"].includes(tool.id)
          ? <TextConversionPage tool={tool} />
          : ["pdf-to-word", "word-to-pdf"].includes(tool.id)
            ? <OfficeConversionPage tool={tool} />
            : <ImageConversionPage tool={tool} />
      : tool.workflowType === "page-tool"
        ? <PdfPageToolPage tool={tool} />
        : tool.workflowType === "editor"
          ? <LazyGuestAppRoute view="tool-upload" publicTool={tool.id} />
        : <ToolLandingPage tool={tool} />,
  }));

const appScreenRouteObjects = Object.entries(APP_ROUTE_SECTIONS).map(([path, appSection]) => ({
  path,
  element: <LazyAppContent view="dashboard" appSection={appSection} />,
})).filter(({ path }) => path !== ROUTE_PATHS.analytics);
const guestDashboardRouteObject = appScreenRouteObjects.find(({ path }) => path === ROUTE_PATHS.dashboard);
const protectedAppScreenRouteObjects = appScreenRouteObjects.filter(({ path }) => path !== ROUTE_PATHS.dashboard);

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
          { path: ROUTE_PATHS.support, element: <SupportPage /> },
          { path: ROUTE_PATHS.sharePattern, element: <SecureSharePage /> },
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
            element: <AppLayout />,
            children: [
              { path: ROUTE_PATHS.editorPattern, element: <EditorRoute /> },
              guestDashboardRouteObject,
            ],
          },
          {
            element: <ProtectedRoute />,
            children: [
              {
                element: <AppLayout />,
                children: [
                  ...protectedAppScreenRouteObjects,
                  {
                    element: <OwnerRoute />,
                    children: [
                      { path: ROUTE_PATHS.analytics, element: <LazyAppContent view="dashboard" appSection="Analytics" /> },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
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

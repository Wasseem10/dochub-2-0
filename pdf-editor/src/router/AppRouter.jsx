import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider, useParams, useSearchParams } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { AuthLayout } from "../layouts/AuthLayout.jsx";
import { PublicLayout } from "../layouts/PublicLayout.jsx";
import { NotFoundPage } from "../pages/errors/NotFoundPage.jsx";
import { PublicPlaceholderPage } from "../pages/public/PublicPlaceholderPage.jsx";
import { FeaturesPage } from "../pages/public/FeaturesPage.jsx";
import { ToolDirectoryPage } from "../pages/public/ToolDirectoryPage.jsx";
import { ToolCategoryPage } from "../pages/public/ToolCategoryPage.jsx";
import { SecureSharePage } from "../pages/public/SecureSharePage.jsx";
import { SupportPage } from "../pages/public/SupportPage.jsx";
import { ToolLandingPage } from "../pages/public/ToolLandingPage.jsx";
import { WorkflowUnavailablePage } from "../pages/public/WorkflowUnavailablePage.jsx";
import { TOOL_REGISTRY } from "../tools/toolRegistry.js";
import { TOOL_CATEGORY_PAGES } from "../tools/toolCategoryPages.js";
import { getEditorToolPreset } from "../tools/editorToolPresets.js";
import { LazyAppContent, LazyAuthRouteProvider, LazyGuestAppRoute, LazyPublicAppRoute } from "./LazyAppRoute.jsx";
import { OwnerRoute } from "./OwnerRoute.jsx";
import { ProtectedRoute } from "./ProtectedRoute.jsx";
import { PublicOnlyRoute } from "./PublicOnlyRoute.jsx";
import { RouteErrorBoundary } from "./RouteErrorBoundary.jsx";
import { APP_ROUTE_SECTIONS, PUBLIC_PLACEHOLDER_ROUTES } from "./routes.js";
import { ROUTE_PATHS } from "./routePaths.js";

const lazyNamed = (loader, exportName) => lazy(() => loader().then((module) => ({ default: module[exportName] })));
const LazyComparePdfPage = lazyNamed(() => import("../pages/public/ComparePdfPage.jsx"), "ComparePdfPage");
const LazyDocumentAnalysisPage = lazyNamed(() => import("../pages/public/DocumentAnalysisPage.jsx"), "DocumentAnalysisPage");
const LazyImageConversionPage = lazyNamed(() => import("../pages/public/ImageConversionPage.jsx"), "ImageConversionPage");
const LazyOfficeConversionPage = lazyNamed(() => import("../pages/public/OfficeConversionPage.jsx"), "OfficeConversionPage");
const LazyOcrPdfPage = lazyNamed(() => import("../pages/public/OcrPdfPage.jsx"), "OcrPdfPage");
const LazyOpenDocumentConversionPage = lazyNamed(() => import("../pages/public/OpenDocumentConversionPage.jsx"), "OpenDocumentConversionPage");
const LazyPdfPageToolPage = lazyNamed(() => import("../pages/public/PdfPageToolPage.jsx"), "PdfPageToolPage");
const LazyPdfProtectionPage = lazyNamed(() => import("../pages/public/PdfProtectionPage.jsx"), "PdfProtectionPage");
const LazyRedactPdfPage = lazyNamed(() => import("../pages/public/RedactPdfPage.jsx"), "RedactPdfPage");
const LazyScanPdfPage = lazyNamed(() => import("../pages/public/ScanPdfPage.jsx"), "ScanPdfPage");
const LazyStructuredPdfConversionPage = lazyNamed(() => import("../pages/public/StructuredPdfConversionPage.jsx"), "StructuredPdfConversionPage");
const LazyTemplateBuilderPage = lazyNamed(() => import("../pages/public/TemplateBuilderPage.jsx"), "TemplateBuilderPage");
const LazyTextConversionPage = lazyNamed(() => import("../pages/public/TextConversionPage.jsx"), "TextConversionPage");
const LazyToPdfConversionPage = lazyNamed(() => import("../pages/public/ToPdfConversionPage.jsx"), "ToPdfConversionPage");

function PublicToolBoundary({ children }) {
  return <Suspense fallback={<div className="public-route-loading" role="status">Opening PDF tool…</div>}>{children}</Suspense>;
}

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

const publicPlaceholderRouteObjects = PUBLIC_PLACEHOLDER_ROUTES.filter((route) => route.path !== ROUTE_PATHS.features).map((route) => ({
  path: route.path,
  element: <PublicPlaceholderPage {...route} />,
}));

const toolRouteObjects = TOOL_REGISTRY
  .filter((tool) => tool.route !== ROUTE_PATHS.editPdf)
  .map((tool) => ({
    path: tool.route,
    element: <PublicToolBoundary>{tool.id === "redact-pdf"
      ? <LazyRedactPdfPage tool={tool} />
      : ["unlock-pdf", "flatten-pdf", "remove-pdf-password"].includes(tool.id)
        ? <LazyPdfProtectionPage tool={tool} />
      : ["pdf-scanner", "scan-to-pdf", "image-to-searchable-pdf"].includes(tool.id)
        ? <LazyScanPdfPage tool={tool} />
      : ["rtf-to-pdf", "odt-to-pdf", "odp-to-pdf", "ods-to-pdf", "epub-to-pdf", "zip-to-pdf"].includes(tool.id)
        ? <LazyOpenDocumentConversionPage tool={tool} />
      : ["ai-pdf", "chat-with-pdf", "summarize-pdf", "translate-pdf", "extract-data-from-pdf", "ask-pdf", "ai-question-generator", "contract-analyzer", "resume-analyzer"].includes(tool.id)
        ? <LazyDocumentAnalysisPage tool={tool} />
      : ["resume-templates", "contract-templates", "nda-templates", "invoice-templates", "offer-letter-templates"].includes(tool.id)
        ? <LazyTemplateBuilderPage tool={tool} />
      : ["compare-pdf", "document-version-comparison"].includes(tool.id)
        ? <LazyComparePdfPage tool={tool} />
      : tool.id === "ocr-pdf"
        ? <LazyOcrPdfPage tool={tool} />
      : tool.workflowType === "converter"
      ? ["pdf-to-excel", "pdf-to-powerpoint", "pdf-to-html"].includes(tool.id)
        ? <LazyStructuredPdfConversionPage tool={tool} />
        : ["excel-to-pdf", "powerpoint-to-pdf", "html-to-pdf"].includes(tool.id)
          ? <LazyToPdfConversionPage tool={tool} />
        : ["pdf-to-txt", "txt-to-pdf"].includes(tool.id)
          ? <LazyTextConversionPage tool={tool} />
          : ["pdf-to-word", "word-to-pdf"].includes(tool.id)
            ? <LazyOfficeConversionPage tool={tool} />
            : <LazyImageConversionPage tool={tool} />
      : tool.workflowType === "page-tool"
        ? <LazyPdfPageToolPage tool={tool} />
        : tool.workflowType === "editor"
          ? <LazyGuestAppRoute view="tool-upload" publicTool={tool.id} />
        : <ToolLandingPage tool={tool} />}</PublicToolBoundary>,
  }));

const toolCategoryRouteObjects = TOOL_CATEGORY_PAGES.map((categoryPage) => ({
  path: categoryPage.route,
  element: <ToolCategoryPage categoryPage={categoryPage} />,
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
          { path: ROUTE_PATHS.features, element: <FeaturesPage /> },
          { path: ROUTE_PATHS.tools, element: <ToolDirectoryPage /> },
          { path: ROUTE_PATHS.support, element: <SupportPage /> },
          { path: ROUTE_PATHS.sharePattern, element: <SecureSharePage /> },
          ...toolCategoryRouteObjects,
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

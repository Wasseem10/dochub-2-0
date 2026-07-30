import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider, useParams, useSearchParams } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout.jsx";
import { AuthLayout } from "../layouts/AuthLayout.jsx";
import { PublicLayout } from "../layouts/PublicLayout.jsx";
import { NotFoundPage } from "../pages/errors/NotFoundPage.jsx";
import { AboutPage } from "../pages/public/AboutPage.jsx";
import { ComparisonHubPage } from "../pages/public/ComparisonHubPage.jsx";
import { PublicPlaceholderPage } from "../pages/public/PublicPlaceholderPage.jsx";
import { PrivacyPolicyPage } from "../pages/public/PrivacyPolicyPage.jsx";
import { FeaturesPage } from "../pages/public/FeaturesPage.jsx";
import { LandingRoute } from "../pages/public/LandingRoute.jsx";
import { ToolDirectoryPage } from "../pages/public/ToolDirectoryPage.jsx";
import { ToolCategoryPage } from "../pages/public/ToolCategoryPage.jsx";
import { ToolLandingPage } from "../pages/public/ToolLandingPage.jsx";
import { VendorComparisonPage } from "../pages/public/VendorComparisonPage.jsx";
import { TOOL_REGISTRY } from "../tools/toolRegistry.js";
import { TOOL_CATEGORY_PAGES } from "../tools/toolCategoryPages.js";
import { EDITORIAL_RESOURCE_PATHS } from "../editorial/editorialRoutePaths.js";
import { getEditorToolPreset } from "../tools/editorToolPresets.js";
import { LazyAppContent, LazyAuthRouteProvider, LazyGuestAppRoute } from "./LazyAppRoute.jsx";
import { OwnerRoute } from "./OwnerRoute.jsx";
import { ProtectedRoute } from "./ProtectedRoute.jsx";
import { PublicOnlyRoute } from "./PublicOnlyRoute.jsx";
import { RouteErrorBoundary, RouteErrorView } from "./RouteErrorBoundary.jsx";
import { APP_ROUTE_SECTIONS, PUBLIC_PLACEHOLDER_ROUTES } from "./routes.js";
import { ROUTE_PATHS } from "./routePaths.js";
import { PUBLIC_TOOL_MODULE_LOADERS } from "./publicToolModules.js";

const lazyNamed = (loader, exportName) => lazy(() => loader().then((module) => ({ default: module[exportName] })));
const LazyComparePdfPage = lazyNamed(PUBLIC_TOOL_MODULE_LOADERS.comparePdf, "ComparePdfPage");
const LazyDocumentAnalysisPage = lazyNamed(PUBLIC_TOOL_MODULE_LOADERS.documentAnalysis, "DocumentAnalysisPage");
const LazyImageConversionPage = lazyNamed(PUBLIC_TOOL_MODULE_LOADERS.imageConversion, "ImageConversionPage");
const LazyOfficeConversionPage = lazyNamed(PUBLIC_TOOL_MODULE_LOADERS.officeConversion, "OfficeConversionPage");
const LazyOcrPdfPage = lazyNamed(PUBLIC_TOOL_MODULE_LOADERS.ocrPdf, "OcrPdfPage");
const LazyOpenDocumentConversionPage = lazyNamed(PUBLIC_TOOL_MODULE_LOADERS.openDocumentConversion, "OpenDocumentConversionPage");
const LazyPdfPageToolPage = lazyNamed(PUBLIC_TOOL_MODULE_LOADERS.pdfPageTool, "PdfPageToolPage");
const LazyPdfProtectionPage = lazyNamed(PUBLIC_TOOL_MODULE_LOADERS.pdfProtection, "PdfProtectionPage");
const LazyRedactPdfPage = lazyNamed(PUBLIC_TOOL_MODULE_LOADERS.redactPdf, "RedactPdfPage");
const LazyScanPdfPage = lazyNamed(PUBLIC_TOOL_MODULE_LOADERS.scanPdf, "ScanPdfPage");
const LazySecureSharePage = lazyNamed(() => import("../pages/public/SecureSharePage.jsx"), "SecureSharePage");
const LazySigningRequestPage = lazyNamed(() => import("../pages/public/SigningRequestPage.jsx"), "SigningRequestPage");
const LazySupportPage = lazyNamed(() => import("../pages/public/SupportPage.jsx"), "SupportPage");
const LazyStructuredPdfConversionPage = lazyNamed(PUBLIC_TOOL_MODULE_LOADERS.structuredPdfConversion, "StructuredPdfConversionPage");
const LazyTemplateBuilderPage = lazyNamed(PUBLIC_TOOL_MODULE_LOADERS.templateBuilder, "TemplateBuilderPage");
const LazyTextConversionPage = lazyNamed(PUBLIC_TOOL_MODULE_LOADERS.textConversion, "TextConversionPage");
const LazyToPdfConversionPage = lazyNamed(PUBLIC_TOOL_MODULE_LOADERS.toPdfConversion, "ToPdfConversionPage");
const LazyEditorialResourceRoute = lazyNamed(() => import("../pages/public/EditorialResourceRoute.jsx"), "EditorialResourceRoute");

function PublicToolBoundary({ children }) {
  return (
    <Suspense fallback={(
      <main className="public-route-loading" aria-labelledby="public-route-loading-title">
        <section role="status" aria-live="polite">
          <span aria-hidden="true" className="public-route-loading-icon">PDF</span>
          <div>
            <h1 id="public-route-loading-title">Opening your PDF tool</h1>
            <p>Loading the controls for this task. Your document has not been selected or uploaded.</p>
          </div>
          <div className="public-route-loading-progress" aria-hidden="true"><span /></div>
        </section>
      </main>
    )}>
      {children}
    </Suspense>
  );
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

const editorialResourcePathSet = new Set(EDITORIAL_RESOURCE_PATHS);
const publicPlaceholderRouteObjects = PUBLIC_PLACEHOLDER_ROUTES.filter((route) => ![ROUTE_PATHS.features, ROUTE_PATHS.privacy].includes(route.path) && !editorialResourcePathSet.has(route.path)).map((route) => ({
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

const editorialResourceRouteObjects = EDITORIAL_RESOURCE_PATHS.map((path) => ({
  path,
  element: <PublicToolBoundary><LazyEditorialResourceRoute /></PublicToolBoundary>,
}));

const appScreenRouteObjects = Object.entries(APP_ROUTE_SECTIONS).map(([path, appSection]) => ({
  path,
  element: <LazyAppContent view="dashboard" appSection={appSection} />,
})).filter(({ path }) => path !== ROUTE_PATHS.analytics);
const guestAppPaths = new Set([ROUTE_PATHS.dashboard, ROUTE_PATHS.appTools]);
const guestAppScreenRouteObjects = appScreenRouteObjects.filter(({ path }) => guestAppPaths.has(path));
const protectedAppScreenRouteObjects = appScreenRouteObjects.filter(({ path }) => !guestAppPaths.has(path));

export const appRouteObjects = [
  {
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: ROUTE_PATHS.home, element: <LandingRoute /> },
          { path: ROUTE_PATHS.about, element: <AboutPage /> },
          { path: ROUTE_PATHS.compare, element: <ComparisonHubPage /> },
          { path: ROUTE_PATHS.comparisonPattern, element: <VendorComparisonPage /> },
          { path: ROUTE_PATHS.privacy, element: <PrivacyPolicyPage /> },
          { path: ROUTE_PATHS.editPdf, element: <PublicEditorRoute /> },
          { path: ROUTE_PATHS.features, element: <FeaturesPage /> },
          { path: ROUTE_PATHS.tools, element: <ToolDirectoryPage /> },
          { path: ROUTE_PATHS.support, element: <PublicToolBoundary><LazySupportPage /></PublicToolBoundary> },
          ...editorialResourceRouteObjects,
          { path: ROUTE_PATHS.share, element: <PublicToolBoundary><LazySecureSharePage /></PublicToolBoundary> },
          { path: ROUTE_PATHS.sharePattern, element: <PublicToolBoundary><LazySecureSharePage /></PublicToolBoundary> },
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
              ...guestAppScreenRouteObjects,
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
      { path: ROUTE_PATHS.sign, element: <PublicToolBoundary><LazySigningRequestPage /></PublicToolBoundary> },
      { path: ROUTE_PATHS.signPattern, element: <PublicToolBoundary><LazySigningRequestPage /></PublicToolBoundary> },
      ...(import.meta.env.DEV ? [{ path: "/__route-error-preview", element: <RouteErrorView /> }] : []),
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

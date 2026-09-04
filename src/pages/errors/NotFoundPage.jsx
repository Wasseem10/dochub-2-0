import { useLocation } from "react-router-dom";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { RouteErrorView } from "../../router/RouteErrorBoundary.jsx";

export function NotFoundPage() {
  const { pathname } = useLocation();
  return (
    <>
      <PageMetadata title="Page Not Found | PDFEnrich" description="The requested PDFEnrich page could not be found." canonicalUrl={pathname} noIndex />
      <RouteErrorView isLoadingFailure={false} />
    </>
  );
}

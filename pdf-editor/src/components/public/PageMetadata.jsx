import { useEffect } from "react";
import { trackPageView } from "../../analytics/productAnalytics.js";
import { absoluteSiteUrl } from "../../config/site.js";

function setMeta(name, content, attribute = "name") {
  let element = document.head.querySelector(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

export function PageMetadata({ title, description, canonicalUrl, schemas = [], noIndex = false }) {
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const absoluteCanonical = absoluteSiteUrl(canonicalUrl);
    document.title = title;
    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:url", absoluteCanonical, "property");
    const socialImage = absoluteSiteUrl("/homepage/hero-product-stage.png");
    setMeta("og:site_name", "FixThatPDF", "property");
    setMeta("og:locale", "en_US", "property");
    setMeta("og:image", socialImage, "property");
    setMeta("og:image:alt", "FixThatPDF browser PDF workspace", "property");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", socialImage);
    setMeta("robots", noIndex ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", absoluteCanonical);

    trackPageView(canonicalUrl);

    const scriptId = "fixthatpdf-structured-data";
    document.getElementById(scriptId)?.remove();
    document.getElementById("fixthatpdf-prerender-structured-data")?.remove();
    const pageSchema = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description,
      url: absoluteCanonical,
      inLanguage: "en-US",
      isPartOf: { "@type": "WebSite", name: "FixThatPDF", url: absoluteSiteUrl("/") },
    };
    const pageSchemas = [pageSchema, ...schemas];
    if (pageSchemas.length) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(pageSchemas);
      document.head.appendChild(script);
    }
    return () => document.getElementById(scriptId)?.remove();
  }, [canonicalUrl, description, noIndex, schemas, title]);
  return null;
}

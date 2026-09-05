import { useEffect } from "react";
import { trackPageView } from "../../analytics/productAnalytics.js";
import { absoluteSiteUrl } from "../../config/site.js";
import { editorialShareImagePath, hasToolShareImage } from "../../editorial/toolEvidence.js";
import { isEditorialResourcePath } from "../../editorial/editorialRoutePaths.js";
import { PRIVACY_CHOICE_EVENT } from "../../privacy/privacyChoices.js";
import { publicPageLastModified } from "../../seo/publicFreshness.js";
import { TOOL_BY_ROUTE } from "../../tools/toolRegistry.js";

function setMeta(name, content, attribute = "name") {
  let element = document.head.querySelector(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

export function PageMetadata({ title, description, canonicalUrl, schemas = [], noIndex = false, toolStatus, socialImage, socialImageAlt }) {
  const registeredToolStatus = TOOL_BY_ROUTE.get(canonicalUrl)?.status;
  const resolvedToolStatus = toolStatus || registeredToolStatus;
  const shouldNoIndex = noIndex || (resolvedToolStatus && resolvedToolStatus !== "available");
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const absoluteCanonical = absoluteSiteUrl(canonicalUrl);
    document.title = title;
    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:url", absoluteCanonical, "property");
    const hasDedicatedSocialImage = hasToolShareImage(canonicalUrl) || isEditorialResourcePath(canonicalUrl);
    const resolvedSocialImage = absoluteSiteUrl(socialImage || (hasDedicatedSocialImage ? editorialShareImagePath(canonicalUrl) : "/og-editorial.png"));
    const resolvedSocialAlt = socialImageAlt || `${title.replace(/ \| PDFEnrich$/, "")} — PDFEnrich guide and browser tool`;
    setMeta("og:site_name", "PDFEnrich", "property");
    setMeta("og:locale", "en_US", "property");
    setMeta("og:image", resolvedSocialImage, "property");
    setMeta("og:image:width", "1200", "property");
    setMeta("og:image:height", "630", "property");
    setMeta("og:image:alt", resolvedSocialAlt, "property");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", resolvedSocialImage);
    setMeta("twitter:image:alt", resolvedSocialAlt);
    setMeta("robots", shouldNoIndex ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", absoluteCanonical);

    trackPageView(canonicalUrl);
    const trackAcceptedPageView = (event) => {
      if (event.detail?.analytics === true) trackPageView(canonicalUrl);
    };
    window.addEventListener(PRIVACY_CHOICE_EVENT, trackAcceptedPageView);

    const scriptId = "pdfenrich-structured-data";
    document.getElementById(scriptId)?.remove();
    document.getElementById("pdfenrich-prerender-structured-data")?.remove();
    const pageSchema = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description,
      url: absoluteCanonical,
      inLanguage: "en-US",
      dateModified: publicPageLastModified(canonicalUrl),
      isPartOf: { "@type": "WebSite", name: "PDFEnrich", url: absoluteSiteUrl("/") },
    };
    const pageSchemas = [pageSchema, ...schemas];
    if (pageSchemas.length) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(pageSchemas);
      document.head.appendChild(script);
    }
    return () => {
      window.removeEventListener(PRIVACY_CHOICE_EVENT, trackAcceptedPageView);
      document.getElementById(scriptId)?.remove();
    };
  }, [canonicalUrl, description, schemas, shouldNoIndex, socialImage, socialImageAlt, title]);
  return null;
}

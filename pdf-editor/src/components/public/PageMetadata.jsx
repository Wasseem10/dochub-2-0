import { useEffect } from "react";
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
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("robots", noIndex ? "noindex, follow" : "index, follow");

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", absoluteCanonical);

    const scriptId = "realpdf-structured-data";
    document.getElementById(scriptId)?.remove();
    if (schemas.length) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(schemas.length === 1 ? schemas[0] : schemas);
      document.head.appendChild(script);
    }
    return () => document.getElementById(scriptId)?.remove();
  }, [canonicalUrl, description, noIndex, schemas, title]);
  return null;
}

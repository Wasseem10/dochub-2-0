import { absoluteSiteUrl } from "../config/site.js";
import { ROUTE_PATHS } from "../router/routePaths.js";

/** @param {import("./toolRegistry.js").ToolRecord} tool */
export function toolSeoSchemas(tool) {
  /** @type {Record<string, unknown>[]} */
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "PDF tools", item: absoluteSiteUrl(ROUTE_PATHS.tools) },
        { "@type": "ListItem", position: 2, name: tool.name, item: absoluteSiteUrl(tool.route) },
      ],
    },
  ];
  if (tool.searchPriority) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: tool.name,
      url: absoluteSiteUrl(tool.route),
      description: tool.metaDescription,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires a modern JavaScript-enabled browser",
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: tool.benefits,
    });
  }
  return schemas;
}

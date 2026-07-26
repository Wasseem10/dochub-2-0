import { absoluteSiteUrl } from "../config/site.js";
import { ROUTE_PATHS } from "../router/routePaths.js";

export function toolSeoSchemas(tool) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "PDF tools", item: absoluteSiteUrl(ROUTE_PATHS.tools) },
        { "@type": "ListItem", position: 2, name: tool.name, item: absoluteSiteUrl(tool.route) },
      ],
    },
  ];
}

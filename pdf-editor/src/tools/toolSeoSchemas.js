import { absoluteSiteUrl } from "../config/site.js";
import { ROUTE_PATHS } from "../router/routePaths.js";
import { HIGH_INTENT_TOOL_IDS } from "./highIntentToolContent.js";

const highIntentIds = new Set(HIGH_INTENT_TOOL_IDS);

export function toolSeoSchemas(tool) {
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

  if (highIntentIds.has(tool.id)) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: tool.faqEntries.map((entry) => ({
        "@type": "Question",
        name: entry.question,
        acceptedAnswer: { "@type": "Answer", text: entry.answer },
      })),
    });
  }

  if (tool.schemaType === "SoftwareApplication") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: tool.name,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: tool.metaDescription,
      url: absoluteSiteUrl(tool.route),
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock" },
    });
  }

  return schemas;
}

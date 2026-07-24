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
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: `How to use ${tool.name}`,
      step: tool.steps.map((step, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: `Step ${index + 1}`,
        text: step,
        url: absoluteSiteUrl(tool.route),
      })),
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

  return schemas;
}

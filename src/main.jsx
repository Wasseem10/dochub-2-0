import React from "react";
import { createRoot } from "react-dom/client";
import { PrivacyConsentBanner } from "./components/privacy/PrivacyChoices.jsx";
import { AppRouter } from "./router/AppRouter.jsx";
import "./styles.css";
import "./landing-redesign.css";
import "./lattice-pdf.css";
import "./brand-wordmark.css";
import "./route-shells.css";
import "./tool-platform.css";
import "./release-fixes.css";
import "./features-page.css";
import "./seo-category.css";
import "./editorial-resources.css";
import "./tool-landing-editorial.css";
import "./homepage-reference.css";
import "./popular-tools-professional.css";
import "./homepage-paper-trail.css";
import "./homepage-faq-guided.css";
import "./comparison-pages.css";
import "./context-hero.css";
import "./context-workflow.css";
import "./context-ending.css";
import { migratePdfEnrichStorage } from "./brand/storageMigration.js";
import { installProductionMonitoring } from "./monitoring/productionMonitoring.js";

migratePdfEnrichStorage();
installProductionMonitoring();

const rootElement = document.getElementById("root");
rootElement.replaceChildren();

createRoot(rootElement).render(
  <React.StrictMode>
    <AppRouter />
    <PrivacyConsentBanner />
  </React.StrictMode>,
);

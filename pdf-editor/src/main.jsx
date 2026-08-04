import React from "react";
import { createRoot } from "react-dom/client";
import { PrivacyConsentBanner } from "./components/privacy/PrivacyChoices.jsx";
import { AppRouter } from "./router/AppRouter.jsx";
import "./styles.css";
import "./editor-overrides.css";
import "./dashboard-redesign.css";
import "./landing-redesign.css";
import "./lattice-pdf.css";
import "./brand-wordmark.css";
import "./route-shells.css";
import "./tool-platform.css";
import "./reference-editor.css";
import "./release-fixes.css";
import "./dashboard-premium.css";
import "./features-page.css";
import "./seo-category.css";
import "./editorial-resources.css";
import "./dashboard-editorial.css";
import "./editor-editorial.css";
import "./auth-reference.css";
import "./dashboard-bright.css";
import "./tool-landing-editorial.css";
import "./homepage-reference.css";
import "./popular-tools-professional.css";
import "./homepage-paper-trail.css";
import "./homepage-faq-guided.css";
import "./comparison-pages.css";
import "./components/editor/finish-export-modal.css";
import { migratePdfEnrichStorage } from "./brand/storageMigration.js";
import { installProductionMonitoring } from "./monitoring/productionMonitoring.js";
import { VercelWebAnalytics } from "./analytics/VercelWebAnalytics.jsx";

migratePdfEnrichStorage();
installProductionMonitoring();

const rootElement = document.getElementById("root");
rootElement.replaceChildren();

createRoot(rootElement).render(
  <React.StrictMode>
    <AppRouter />
    <PrivacyConsentBanner />
    <VercelWebAnalytics />
  </React.StrictMode>,
);

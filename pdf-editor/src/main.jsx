import React from "react";
import { createRoot } from "react-dom/client";
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
import "./signature-workflow.css";
import { installProductionMonitoring } from "./monitoring/productionMonitoring.js";

installProductionMonitoring();

const rootElement = document.getElementById("root");
rootElement.replaceChildren();

createRoot(rootElement).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
);

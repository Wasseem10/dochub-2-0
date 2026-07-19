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

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
);

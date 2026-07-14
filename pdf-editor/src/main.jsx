import React from "react";
import { createRoot } from "react-dom/client";
import { AppRouter } from "./router/AppRouter.jsx";
import "./styles.css";
import "./editor-overrides.css";
import "./landing-redesign.css";
import "./lattice-pdf.css";
import "./route-shells.css";
import "./tool-platform.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
);

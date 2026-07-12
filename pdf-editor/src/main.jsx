import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";
import "./editor-overrides.css";
import "./landing-redesign.css";
import "./lattice-pdf.css";
import "./dashboard-redesign.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

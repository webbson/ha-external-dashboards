import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { DisplayApp } from "./DisplayApp.js";

// Expose uPlot globally for Handlebars template <script> tags
(window as any).uPlot = uPlot;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DisplayApp />
  </StrictMode>
);

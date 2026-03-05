import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DisplayApp } from "./DisplayApp.js";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DisplayApp />
  </StrictMode>
);

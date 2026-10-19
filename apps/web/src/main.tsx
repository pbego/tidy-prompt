import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { PromptStoreProvider } from "./state/promptStore.js";
import "./styles.css";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");

createRoot(container).render(
  <StrictMode>
    <PromptStoreProvider>
      <App />
    </PromptStoreProvider>
  </StrictMode>,
);

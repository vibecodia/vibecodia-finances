import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.tsx";
import "./index.css";
import { CategoriesProvider } from "./contexts/CategoriesContext.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";
import { VerificationProvider } from "./contexts/VerificationContext.tsx";
import "@fontsource/kalam/400.css";
import "@fontsource/kalam/700.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ThemeProvider>
        <VerificationProvider>
          <CategoriesProvider>
            <App />
          </CategoriesProvider>
        </VerificationProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);

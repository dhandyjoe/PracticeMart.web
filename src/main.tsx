import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/space-grotesk/latin-700.css";
import "@fontsource/jetbrains-mono/latin-600.css";
import "./styles/tokens.css";
import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { createAppRouter } from "./app/router";
import { SessionProvider } from "./app/session";
import { applyDocumentSettings, applyUrlHooks, SETTINGS_EVENT } from "./sim/settings";

// DEV-02: buka /settings?deterministic=true&latency=0… langsung dari luar app (juga tanpa login):
// simpan, lalu kembali ke halaman sebelumnya tanpa merender UI.
const hooked = location.pathname === "/settings" && applyUrlHooks(new URLSearchParams(location.search));
applyDocumentSettings();
window.addEventListener(SETTINGS_EVENT, applyDocumentSettings);
if (hooked) {
  if (history.length > 1) history.back();
  else location.replace("/");
}

if (!hooked) createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SessionProvider>
      <RouterProvider router={createAppRouter()} />
    </SessionProvider>
  </StrictMode>,
);

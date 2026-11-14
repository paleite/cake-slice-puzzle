import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import "./styles.css";

// prompt mode keeps updates from reloading the running game; Workbox skipWaiting
// activates the new service worker so a normal page refresh picks up the new build.
function syncAppHeight() {
  const height = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${Math.round(height)}px`);
}
syncAppHeight();
window.visualViewport?.addEventListener("resize", syncAppHeight);
window.visualViewport?.addEventListener("scroll", syncAppHeight);
window.addEventListener("orientationchange", syncAppHeight);
window.addEventListener("resize", syncAppHeight);

let hadController = navigator.serviceWorker?.controller != null;
navigator.serviceWorker?.addEventListener("controllerchange", () => {
  if (!hadController) {
    hadController = true;
    return;
  }
  window.location.reload();
});

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    void registration?.update();
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

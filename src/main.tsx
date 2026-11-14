import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import "./styles.css";

let updateRequested = false;

navigator.serviceWorker?.addEventListener("controllerchange", () => {
  if (updateRequested) window.location.reload();
});

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(new Event("cake:pwa-update-ready"));
  },
});

window.addEventListener("cake:pwa-update", () => {
  updateRequested = true;
  void updateSW(true);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

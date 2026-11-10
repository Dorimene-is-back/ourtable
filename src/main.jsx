import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Only the installed app needs a service worker, for timer notifications.
if ("serviceWorker" in navigator && window.matchMedia("(display-mode: standalone)").matches) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

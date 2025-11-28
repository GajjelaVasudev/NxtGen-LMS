import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Dev helper: render a visible overlay for uncaught errors so a white page
// can be diagnosed quickly. Only active during development.
if (import.meta.env.DEV) {
  window.addEventListener('error', (ev) => {
    try {
      const root = document.getElementById('root');
      if (root) {
        root.innerHTML = '';
        const pre = document.createElement('pre');
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.background = '#111827';
        pre.style.color = '#fff';
        pre.style.padding = '16px';
        pre.style.borderRadius = '8px';
        pre.style.margin = '24px';
        pre.style.boxShadow = '0 10px 30px rgba(2,6,23,0.6)';
        pre.textContent = `Uncaught error: ${ev.error?.message || ev.message || String(ev)}`;
        root.appendChild(pre);
      }
    } catch (_) {}
    // still let the default handler run
  });

  window.addEventListener('unhandledrejection', (ev) => {
    try {
      const root = document.getElementById('root');
      if (root) {
        root.innerHTML = '';
        const pre = document.createElement('pre');
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.background = '#111827';
        pre.style.color = '#fff';
        pre.style.padding = '16px';
        pre.style.borderRadius = '8px';
        pre.style.margin = '24px';
        pre.style.boxShadow = '0 10px 30px rgba(2,6,23,0.6)';
        pre.textContent = `Unhandled rejection: ${String(ev.reason || ev)}`;
        root.appendChild(pre);
      }
    } catch (_) {}
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

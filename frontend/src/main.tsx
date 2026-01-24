import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './AppRouter';
import './styles.css';

const recoverFromStaleServiceWorker = () => {
  if (!('serviceWorker' in navigator) || !('caches' in window)) return;
  if (sessionStorage.getItem('sw-reset') === '1') return;

  window.addEventListener('unhandledrejection', (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    const message = typeof reason === 'string'
      ? reason
      : reason?.message || String(reason ?? '');

    if (!message.includes('bad-precaching-response')) return;

    sessionStorage.setItem('sw-reset', '1');
    Promise.all([
      navigator.serviceWorker.getRegistrations().then((regs) => Promise.all(regs.map((reg) => reg.unregister()))),
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
    ]).finally(() => {
      window.location.reload();
    });
  });
};

recoverFromStaleServiceWorker();

const disableServiceWorkerForAdmin = () => {
  if (!('serviceWorker' in navigator) || !('caches' in window)) return;
  if (!window.location.pathname.startsWith('/admin')) return;
  if (sessionStorage.getItem('admin-sw-reset') === '1') return;
  sessionStorage.setItem('admin-sw-reset', '1');
  Promise.all([
    navigator.serviceWorker.getRegistrations().then((regs) => Promise.all(regs.map((reg) => reg.unregister()))),
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
  ]).finally(() => {
    window.location.reload();
  });
};

disableServiceWorkerForAdmin();

const stripCloudflareBeaconForAdmin = () => {
  if (!window.location.pathname.startsWith('/admin')) return;
  const removeBeaconScripts = () => {
    document
      .querySelectorAll('script[src*="static.cloudflareinsights.com"]')
      .forEach((node) => node.parentElement?.removeChild(node));
  };
  removeBeaconScripts();

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLScriptElement)) return;
        if (node.src && node.src.includes('static.cloudflareinsights.com')) {
          node.parentElement?.removeChild(node);
        }
      });
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 10000);
};

stripCloudflareBeaconForAdmin();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

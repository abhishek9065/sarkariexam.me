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

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

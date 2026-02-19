import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import { AppRoutes } from './routes/AppRoutes';
import './styles.css';

const queryClient = new QueryClient();

const normalizeBasename = (value: string) => {
    const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
    return withLeadingSlash.endsWith('/') ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
};

const configuredAdminBasename = normalizeBasename(import.meta.env.VITE_ADMIN_BASENAME ?? '/admin-vnext');
const currentPath = typeof window !== 'undefined' ? window.location.pathname : configuredAdminBasename;
const adminBasename = currentPath.startsWith('/admin-vnext') ? '/admin-vnext' : configuredAdminBasename;
const ADMIN_SW_CLEANUP_KEY = 'admin-vnext-sw-cleanup-ran';

const cleanupLegacyServiceWorker = () => {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return;
    if (!currentPath.startsWith('/admin')) return;
    if (!('serviceWorker' in navigator)) return;
    if (sessionStorage.getItem(ADMIN_SW_CLEANUP_KEY) === '1') return;

    void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
        if (!registrations.length) {
            sessionStorage.setItem(ADMIN_SW_CLEANUP_KEY, '1');
            return;
        }

        const legacyRegistrations = registrations.filter((registration) => {
            const scriptUrl = registration.active?.scriptURL
                || registration.waiting?.scriptURL
                || registration.installing?.scriptURL
                || '';

            return registration.scope === `${window.location.origin}/` || /\/sw\.js(?:$|\?)/i.test(scriptUrl);
        });

        if (!legacyRegistrations.length) {
            sessionStorage.setItem(ADMIN_SW_CLEANUP_KEY, '1');
            return;
        }

        await Promise.all(legacyRegistrations.map((registration) => registration.unregister().catch(() => false)));
        sessionStorage.setItem(ADMIN_SW_CLEANUP_KEY, '1');

        if (navigator.serviceWorker.controller) {
            window.location.reload();
        }
    }).catch(() => {
        sessionStorage.setItem(ADMIN_SW_CLEANUP_KEY, '1');
    });
};

cleanupLegacyServiceWorker();

if (typeof document !== 'undefined') {
    document.body.dataset.adminApp = 'vnext';
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter basename={adminBasename}>
                <AppRoutes />
            </BrowserRouter>
        </QueryClientProvider>
    </StrictMode>
);

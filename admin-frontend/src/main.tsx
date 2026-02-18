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

const configuredAdminBasename = normalizeBasename(import.meta.env.VITE_ADMIN_BASENAME ?? '/admin');
const currentPath = typeof window !== 'undefined' ? window.location.pathname : configuredAdminBasename;
const adminBasename = currentPath.startsWith('/admin-vnext') ? '/admin-vnext' : configuredAdminBasename;

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

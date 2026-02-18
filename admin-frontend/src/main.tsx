import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import { AppRoutes } from './routes/AppRoutes';
import './styles.css';

const queryClient = new QueryClient();
const configuredAdminBasename = import.meta.env.VITE_ADMIN_BASENAME ?? '/admin';
const adminBasename = configuredAdminBasename.endsWith('/')
    ? configuredAdminBasename.slice(0, -1)
    : configuredAdminBasename;

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter basename={adminBasename || '/admin'}>
                <AppRoutes />
            </BrowserRouter>
        </QueryClientProvider>
    </StrictMode>
);

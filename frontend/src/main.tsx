import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './AppRouter';
import './styles.css';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 120_000,
            gcTime: 600_000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');
createRoot(root).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <App />
        </QueryClientProvider>
    </StrictMode>,
);

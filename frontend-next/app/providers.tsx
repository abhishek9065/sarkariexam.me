'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/app/lib/ThemeContext';
import { AuthProvider } from '@/app/lib/AuthContext';
import { LanguageProvider } from '@/app/lib/LanguageContext';

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                // Homepage feed: 5 minutes stale time
                staleTime: 5 * 60 * 1000,
                // Cache for 10 minutes
                gcTime: 10 * 60 * 1000,
                // Retry failed requests once
                retry: 1,
                // Refetch on window focus for fresh data
                refetchOnWindowFocus: true,
                // Don't refetch on mount if data is fresh
                refetchOnMount: false,
                // Network mode
                networkMode: 'online',
            },
            mutations: {
                // Retry mutations once
                retry: 1,
                // Network mode
                networkMode: 'online',
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <LanguageProvider>
                    <AuthProvider>
                        {children}
                    </AuthProvider>
                </LanguageProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}

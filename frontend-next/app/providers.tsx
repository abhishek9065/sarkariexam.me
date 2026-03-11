'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/app/lib/ThemeContext';
import { AuthProvider } from '@/app/lib/AuthContext';
import { LanguageProvider } from '@/app/lib/LanguageContext';

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
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

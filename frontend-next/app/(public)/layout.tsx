import { Suspense, type ReactNode } from 'react';
import { ExactHomeShell } from '@/app/components/ExactHomeShell';

export default function PublicLayout({ children }: { children: ReactNode }) {
    return (
        <div className="app">
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <main id="main-content" className="home-main-content animate-fade-in">
                <ExactHomeShell>
                    <Suspense>{children}</Suspense>
                </ExactHomeShell>
            </main>
        </div>
    );
}

import { Suspense, type ReactNode } from 'react';
import { Footer } from '@/app/components/Footer';
import { Header } from '@/app/components/Header';
import { MobileBottomNav } from '@/app/components/MobileBottomNav';

export default function AppShellLayout({ children }: { children: ReactNode }) {
    return (
        <div className="app">
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <Suspense>
                <Header />
            </Suspense>
            <main id="main-content" className="main-content container animate-fade-in">
                <Suspense>{children}</Suspense>
            </main>
            <Footer />
            <MobileBottomNav />
        </div>
    );
}

'use client';

import { Suspense, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Footer } from '@/app/components/Footer';
import { Header } from '@/app/components/Header';
import { MobileBottomNav } from '@/app/components/MobileBottomNav';

export function AppChrome({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isHomePage = pathname === '/';

    return (
        <div className={`app${isHomePage ? ' app-home' : ''}`}>
            <a href="#main-content" className="skip-link">Skip to main content</a>

            {isHomePage ? (
                <main id="main-content" className="home-main-content animate-fade-in">
                    <Suspense>{children}</Suspense>
                </main>
            ) : (
                <>
                    <Suspense>
                        <Header />
                    </Suspense>
                    <main id="main-content" className="main-content container animate-fade-in">
                        <Suspense>{children}</Suspense>
                    </main>
                    <Footer />
                    <MobileBottomNav />
                </>
            )}
        </div>
    );
}

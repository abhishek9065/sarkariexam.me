import { Suspense, type ReactNode } from 'react';
import { Footer } from '@/app/components/Footer';
import { Header } from '@/app/components/Header';
import { MobileBottomNav } from '@/app/components/MobileBottomNav';
import { ExactHomeShell } from '@/app/components/ExactHomeShell';

const EXACT_HOME_ROUTE_PREFIXES = [
    '/jobs',
    '/results',
    '/admit-cards',
    '/answer-keys',
    '/admissions',
    '/syllabus',
    '/job/',
    '/result/',
    '/admit-card/',
    '/answer-key/',
    '/admission/',
    '/explore',
    '/about',
    '/contact',
    '/privacy',
];

export function AppChrome({
    children,
    pathname,
}: {
    children: ReactNode;
    pathname: string;
}) {
    const isHomePage = pathname === '/';
    const usesExactHomeShell = !isHomePage && EXACT_HOME_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    return (
        <div className={`app${isHomePage ? ' app-home' : ''}`}>
            <a href="#main-content" className="skip-link">Skip to main content</a>

            {isHomePage ? (
                <main id="main-content" className="home-main-content animate-fade-in">
                    <Suspense>{children}</Suspense>
                </main>
            ) : usesExactHomeShell ? (
                <main id="main-content" className="home-main-content animate-fade-in">
                    <ExactHomeShell>
                        <Suspense>{children}</Suspense>
                    </ExactHomeShell>
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

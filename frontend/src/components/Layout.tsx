import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileBottomNav } from './MobileBottomNav';

export function Layout({ children }: { children: ReactNode }) {
    const { pathname } = useLocation();

    /* Scroll to top on route change */
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return (
        <div className="app">
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <Header />
            <main id="main-content" className="main-content container animate-fade-in">
                {children}
            </main>
            <Footer />
            <MobileBottomNav />
        </div>
    );
}

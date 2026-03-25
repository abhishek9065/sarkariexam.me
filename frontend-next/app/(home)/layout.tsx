import { Suspense, type ReactNode } from 'react';

export default function HomeLayout({ children }: { children: ReactNode }) {
    return (
        <div className="app app-home">
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <main id="main-content" className="home-main-content animate-fade-in">
                <Suspense>{children}</Suspense>
            </main>
        </div>
    );
}

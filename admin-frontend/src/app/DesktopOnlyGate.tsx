import { useEffect, useState, type ReactNode } from 'react';

const MIN_DESKTOP_WIDTH = 1120;

const isDesktopWidth = () => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= MIN_DESKTOP_WIDTH;
};

interface DesktopOnlyGateProps {
    children: ReactNode;
}

export function DesktopOnlyGate({ children }: DesktopOnlyGateProps) {
    const [isDesktop, setIsDesktop] = useState(isDesktopWidth);

    useEffect(() => {
        const onResize = () => setIsDesktop(isDesktopWidth());
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    if (isDesktop) return <>{children}</>;

    return (
        <main className="admin-desktop-only" role="main" aria-live="polite">
            <section className="admin-desktop-only-card">
                <h1>Desktop Required</h1>
                <p>
                    SarkariExams Admin vNext is desktop-only.
                    Open this page on a desktop/laptop browser with at least 1120px width.
                </p>
                <a className="admin-btn subtle" href="/admin-legacy">
                    Open Legacy Admin
                </a>
            </section>
        </main>
    );
}

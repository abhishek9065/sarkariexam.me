import { useEffect, useState, type ReactNode } from 'react';
import './AdminDesktopOnlyGate.css';

const MIN_DESKTOP_WIDTH = 1120;

const isDesktopWidth = () => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= MIN_DESKTOP_WIDTH;
};

interface AdminDesktopOnlyGateProps {
    children: ReactNode;
}

export function AdminDesktopOnlyGate({ children }: AdminDesktopOnlyGateProps) {
    const [isDesktop, setIsDesktop] = useState(isDesktopWidth);

    useEffect(() => {
        const onResize = () => setIsDesktop(isDesktopWidth());
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    if (isDesktop) return <>{children}</>;

    return (
        <main className="admin-desktop-gate" role="main" aria-live="polite">
            <section className="admin-desktop-gate-card">
                <h2>Desktop Required For Admin</h2>
                <p>
                    SarkariExams Admin is available only in desktop mode.
                    Use a laptop/desktop browser with minimum width 1120px.
                </p>
                <div className="admin-desktop-gate-actions">
                    <a className="admin-desktop-gate-link" href="/admin-vnext">
                        Open Admin vNext
                    </a>
                </div>
            </section>
        </main>
    );
}

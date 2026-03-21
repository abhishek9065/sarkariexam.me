import { useEffect, useState, type ReactNode } from 'react';

type AdminDesktopGateProps = {
    children: ReactNode;
};

const DESKTOP_MIN_WIDTH = 1120;

const readDesktopMatch = () => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= DESKTOP_MIN_WIDTH;
};

export function AdminDesktopGate({ children }: AdminDesktopGateProps) {
    const [isDesktop, setIsDesktop] = useState(readDesktopMatch);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const handleResize = () => {
            setIsDesktop(readDesktopMatch());
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!isDesktop) {
        return (
            <div className="admin-desktop-gate">
                <div className="admin-desktop-gate-card">
                    <div className="admin-desktop-gate-mark">SE</div>
                    <p className="admin-desktop-gate-kicker">Desktop Required</p>
                    <h1>Open the editorial console on a larger screen.</h1>
                    <p>
                        The rebuilt SarkariExams admin is optimized for dense editorial, review, and governance workflows.
                        Use a desktop or laptop viewport at 1120px or wider to continue.
                    </p>
                    <div className="admin-desktop-gate-actions">
                        <a className="admin-btn primary" href="/">
                            View public site
                        </a>
                        <a className="admin-btn subtle" href="/admin-legacy">
                            Open legacy rollback
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

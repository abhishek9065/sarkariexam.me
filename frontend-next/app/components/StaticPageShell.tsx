import type { ReactNode } from 'react';
import { PublicCategoryRail } from '@/app/components/PublicCategoryRail';
import '@/app/components/PublicSurface.css';

interface StaticPageShellProps {
    icon: string;
    title: string;
    intro: string;
    eyebrow?: string;
    children: ReactNode;
}

export function StaticPageShell({ icon, title, intro, eyebrow = 'Public Information', children }: StaticPageShellProps) {
    return (
        <div className="hp public-shell public-static-shell">
            <section className="public-hero">
                <span className="public-kicker">{eyebrow}</span>
                <div className="public-hero-grid">
                    <div className="public-hero-main">
                        <div className="public-static-icon" aria-hidden="true">{icon}</div>
                        <h1 className="public-title">{title}</h1>
                        <p className="public-sub">{intro}</p>
                    </div>
                </div>
            </section>

            <PublicCategoryRail />

            <div className="public-panel public-static-body">
                {children}
            </div>
        </div>
    );
}

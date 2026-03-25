import type { ReactNode } from 'react';
import { PublicCategoryRail } from '@/app/components/PublicCategoryRail';
import styles from '@/app/components/PortalSurface.module.css';

type StaticPageShellProps = {
    icon: string;
    title: string;
    intro: string;
    eyebrow?: string;
    children: ReactNode;
};

export function StaticPageShell({ icon, title, intro, eyebrow = 'Public information', children }: StaticPageShellProps) {
    return (
        <div className={styles.page}>
            <section className={styles.hero}>
                <div className={styles.heroGrid}>
                    <div className={styles.heroCopy}>
                        <span className={styles.heroKicker}>{eyebrow}</span>
                        <h1 className={styles.heroTitle}>{icon} {title}</h1>
                        <p className={styles.heroSub}>{intro}</p>
                    </div>
                </div>
            </section>

            <PublicCategoryRail />

            <section className={styles.panel}>
                <div className={styles.staticBody}>{children}</div>
            </section>
        </div>
    );
}

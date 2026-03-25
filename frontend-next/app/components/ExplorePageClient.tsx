import Link from 'next/link';
import { Icon } from '@/app/components/Icon';
import styles from '@/app/components/PortalSurface.module.css';
import { PublicCategoryRail } from '@/app/components/PublicCategoryRail';
import { EXAM_FAMILY_SHORTCUTS, STATE_SHORTCUTS } from '@/app/lib/ui';

const COLLECTIONS = [
    {
        title: 'Central exams',
        description: 'Direct jumps into the most searched national-level notifications.',
        links: ['UPSC', 'SSC', 'Railway', 'Banking', 'Defence'],
    },
    {
        title: 'State-focused',
        description: 'State-heavy discovery paths for users who start with geography first.',
        links: ['Bihar', 'Uttar Pradesh', 'Rajasthan', 'Madhya Pradesh', 'Delhi'],
    },
    {
        title: 'Need-based',
        description: 'Shortcuts when the user thinks in outcomes instead of organization names.',
        links: ['12th Pass', 'Graduate', 'Police', 'Teaching', 'Medical'],
    },
];

export function ExplorePage() {
    return (
        <div className={styles.page}>
            <section className={styles.hero}>
                <div className={styles.heroGrid}>
                    <div className={styles.heroCopy}>
                        <span className={styles.heroKicker}>Explore</span>
                        <h1 className={styles.heroTitle}>Shortcut discovery for real job-seeking behavior.</h1>
                        <p className={styles.heroSub}>Some users start with the exam body. Others start with their state, qualification, or the kind of job they want. This page supports both.</p>
                    </div>
                    <div className={styles.heroStats}>
                        <div className={styles.statCard}><span className={styles.statLabel}>Collections</span><strong className={styles.statValue}>{COLLECTIONS.length}</strong></div>
                        <div className={styles.statCard}><span className={styles.statLabel}>Exam families</span><strong className={styles.statValue}>{EXAM_FAMILY_SHORTCUTS.length}</strong></div>
                        <div className={styles.statCard}><span className={styles.statLabel}>State jumps</span><strong className={styles.statValue}>{STATE_SHORTCUTS.length}</strong></div>
                    </div>
                </div>
            </section>

            <PublicCategoryRail />

            <div className={styles.dashboardGrid}>
                {COLLECTIONS.map((collection) => (
                    <section key={collection.title} className={styles.dashboardCard}>
                        <div className={styles.panelHeaderBlock}>
                            <p className={styles.sectionEyebrow}>Collection</p>
                            <h2 className={styles.panelTitle}>{collection.title}</h2>
                            <p className={styles.panelCopy}>{collection.description}</p>
                        </div>
                        <div className={styles.chipRow}>
                            {collection.links.map((item) => (
                                <Link key={item} href={`/jobs?q=${encodeURIComponent(item)}`} className={styles.shortcutLink}>
                                    <Icon name="ArrowRight" size={15} />
                                    {item}
                                </Link>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            <section className={styles.panel}>
                <div className={styles.panelHeaderBlock}>
                    <p className={styles.sectionEyebrow}>Popular exam families</p>
                    <h2 className={styles.panelTitle}>Fast access</h2>
                </div>
                <div className={styles.chipRow}>
                    {EXAM_FAMILY_SHORTCUTS.map((item) => (
                        <Link key={item.label} href={item.href} className={styles.softChip}>{item.label}</Link>
                    ))}
                </div>
            </section>
        </div>
    );
}

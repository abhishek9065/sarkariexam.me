import Link from 'next/link';
import { EXAM_FAMILY_SHORTCUTS, STATE_SHORTCUTS } from '@/app/lib/ui';
import { buildCategoryPath } from '@/app/lib/urls';
import styles from './Footer.module.css';

const FOOTER_COLUMNS = [
    {
        title: 'Browse',
        links: [
            { label: 'Latest Jobs', href: buildCategoryPath('job') },
            { label: 'Results', href: buildCategoryPath('result') },
            { label: 'Admit Cards', href: buildCategoryPath('admit-card') },
            { label: 'Answer Keys', href: buildCategoryPath('answer-key') },
            { label: 'Syllabus', href: buildCategoryPath('syllabus') },
            { label: 'Admissions', href: buildCategoryPath('admission') },
        ],
    },
    {
        title: 'Site',
        links: [
            { label: 'About', href: '/about' },
            { label: 'Contact', href: '/contact' },
            { label: 'Privacy', href: '/privacy' },
            { label: 'Disclaimer', href: '/disclaimer' },
            { label: 'Advertise', href: '/advertise' },
            { label: 'Explore', href: '/explore' },
        ],
    },
];

export function Footer() {
    return (
        <footer className={styles.footer} data-testid="app-footer">
            <div className={`container ${styles.inner}`}>
                <div className={styles.top}>
                    <div className={styles.brand}>
                        <span className={styles.brandMark}>SE</span>
                        <div className={styles.brandCopy}>
                            <strong>SarkariExams.me</strong>
                            <p>Premium command center for government jobs, results, admit cards, and exam updates in India.</p>
                        </div>
                    </div>
                    <div className={styles.trustBox}>
                        <h3>Why users can trust this surface</h3>
                        <ul>
                            <li>Official-source links stay visible before every major action.</li>
                            <li>Deadline urgency and stale-data warnings are surfaced early.</li>
                            <li>Mobile scanning is prioritized over decorative clutter.</li>
                        </ul>
                    </div>
                </div>

                <div className={styles.grid}>
                    {FOOTER_COLUMNS.map((column) => (
                        <section key={column.title}>
                            <h3>{column.title}</h3>
                            <div className={styles.linkList}>
                                {column.links.map((link) => (
                                    <Link key={link.href} href={link.href}>{link.label}</Link>
                                ))}
                            </div>
                        </section>
                    ))}

                    <section>
                        <h3>Popular exam families</h3>
                        <div className={styles.chipList}>
                            {EXAM_FAMILY_SHORTCUTS.map((item) => (
                                <Link key={item.label} href={item.href} className={styles.chip}>{item.label}</Link>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h3>State shortcuts</h3>
                        <div className={styles.stateList}>
                            {STATE_SHORTCUTS.map((state) => (
                                <Link key={state} href={`/jobs?q=${encodeURIComponent(state)}`}>{state}</Link>
                            ))}
                        </div>
                    </section>
                </div>

                <div className={styles.bottom}>
                    <p>© 2026 SarkariExams.me. Information is provided for reference and must be verified from the official source before acting.</p>
                    <div className={styles.channels}>
                        <a href="https://t.me/sarkariexamsme" target="_blank" rel="noreferrer">Telegram</a>
                        <a href="https://wa.me/sarkariexamsme" target="_blank" rel="noreferrer">WhatsApp</a>
                        <a href="https://youtube.com/@sarkariexamsme" target="_blank" rel="noreferrer">YouTube</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}

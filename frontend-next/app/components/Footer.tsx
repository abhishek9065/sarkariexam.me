import Link from 'next/link';
const SOCIAL_LINKS = [
    { label: 'Telegram', href: 'https://t.me/sarkariexamsme', icon: '✈️' },
    { label: 'WhatsApp', href: 'https://wa.me/sarkariexamsme', icon: '💬' },
    { label: 'YouTube', href: 'https://youtube.com/@sarkariexamsme', icon: '▶' },
    { label: 'Instagram', href: 'https://instagram.com/sarkariexamsme', icon: '📸' },
    { label: 'X', href: 'https://x.com/sarkariexamsme', icon: '𝕏' },
    { label: 'Facebook', href: 'https://facebook.com/sarkariexamsme', icon: 'f' },
    { label: 'LinkedIn', href: 'https://linkedin.com/company/sarkariexamsme', icon: 'in' },
    { label: 'Threads', href: 'https://threads.net/@sarkariexamsme', icon: '@' },
];

const FOOTER_SECTIONS = [
    {
        title: '📂 Browse',
        links: [
            { label: 'Latest Jobs', to: '/jobs' },
            { label: 'Results', to: '/results' },
            { label: 'Admit Cards', to: '/admit-card' },
            { label: 'Answer Keys', to: '/answer-key' },
            { label: 'Syllabus', to: '/syllabus' },
            { label: 'Admissions', to: '/admission' },
        ],
    },
    {
        title: '🏛️ Popular Exams',
        links: [
            { label: 'SSC', to: '/jobs?q=SSC' },
            { label: 'UPSC', to: '/jobs?q=UPSC' },
            { label: 'Railway (RRB)', to: '/jobs?q=Railway' },
            { label: 'Banking (IBPS)', to: '/jobs?q=IBPS' },
            { label: 'Defence', to: '/jobs?q=Defence' },
            { label: 'State PSC', to: '/jobs?q=PSC' },
        ],
    },
    {
        title: '🔗 Quick Links',
        links: [
            { label: 'About', to: '/about' },
            { label: 'Contact', to: '/contact' },
            { label: 'Explore Organizations', to: '/explore' },
            { label: 'Advertise With Us', to: '/advertise' },
            { label: 'Privacy Policy', to: '/privacy' },
            { label: 'Disclaimer', to: '/disclaimer' },
        ],
    },
];

export function Footer() {
    return (
        <footer className="footer" data-testid="app-footer">
            <div className="container footer-inner">
                <div className="footer-top">
                    <div className="footer-brand">
                        <span className="footer-brand-icon">📋</span>
                        <div>
                            <span className="footer-brand-name">
                                Sarkari<span className="footer-brand-accent">Exams</span>.me
                            </span>
                            <span className="footer-brand-sub">Your Gateway to Government Careers</span>
                        </div>
                    </div>

                    <div className="footer-social footer-social-grid">
                        {SOCIAL_LINKS.map((item) => (
                            <a
                                key={item.label}
                                href={item.href}
                                target="_blank"
                                rel="noreferrer"
                                className="footer-social-link"
                                aria-label={item.label}
                            >
                                {item.icon}
                            </a>
                        ))}
                    </div>
                </div>

                {/* ── Categorized Link Sections ── */}
                <div className="footer-sections">
                    {FOOTER_SECTIONS.map((section) => (
                        <div key={section.title} className="footer-section">
                            <h3 className="footer-section-title">{section.title}</h3>
                            <ul className="footer-section-list">
                                {section.links.map((link) => (
                                    <li key={link.label}>
                                        <Link href={link.to}>{link.label}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="footer-bottom">
                    <p>© 2026 SarkariExams.me — All Rights Reserved</p>
                    <p className="footer-disclaimer">
                        <strong>Disclaimer:</strong> Content is for informational use only. Verify all details from official sources before acting. We do not collect any fees.
                    </p>
                </div>
            </div>
        </footer>
    );
}

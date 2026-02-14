import { Link } from 'react-router-dom';

const SOCIAL_LINKS = [
    { label: 'X / Twitter', href: 'https://x.com/sarkariexamsme' },
    { label: 'Telegram', href: 'https://t.me/sarkariexamsme' },
    { label: 'WhatsApp', href: 'https://wa.me/910000000000' },
    { label: 'Instagram', href: 'https://instagram.com/sarkariexamsme' },
    { label: 'Threads', href: 'https://threads.net/@sarkariexamsme' },
    { label: 'Facebook', href: 'https://facebook.com/sarkariexamsme' },
    { label: 'LinkedIn', href: 'https://linkedin.com/company/sarkariexamsme' },
    { label: 'YouTube', href: 'https://youtube.com/@sarkariexamsme' },
];

const APP_LINKS = [
    { label: 'Android App', href: 'https://play.google.com/store/apps' },
    { label: 'iOS App', href: 'https://apps.apple.com/' },
];

const ORG_LINK_GROUPS: Array<Array<{ label: string; to: string }>> = [
    [
        { label: 'BPSC', to: '/jobs?q=BPSC' },
        { label: 'UPSSSC', to: '/jobs?q=UPSSSC' },
        { label: 'CCC Online', to: '/jobs?q=CCC' },
        { label: 'UP Scholarship', to: '/jobs?q=Scholarship' },
    ],
    [
        { label: 'IBPS', to: '/jobs?q=IBPS' },
        { label: 'SSC', to: '/jobs?q=SSC' },
        { label: 'UPSC', to: '/jobs?q=UPSC' },
        { label: 'Air Force', to: '/jobs?q=Air%20Force' },
    ],
    [
        { label: 'Navy', to: '/jobs?q=Navy' },
        { label: 'RPSC', to: '/jobs?q=RPSC' },
        { label: 'Delhi DSSSB', to: '/jobs?q=DSSSB' },
        { label: 'Railway', to: '/jobs?q=Railway' },
    ],
    [
        { label: 'UPPCS', to: '/jobs?q=UPPCS' },
        { label: 'HSSC', to: '/jobs?q=HSSC' },
        { label: 'TET', to: '/jobs?q=TET' },
        { label: 'Coast Guard', to: '/jobs?q=Coast%20Guard' },
    ],
    [
        { label: 'Police Vacancy', to: '/jobs?q=Police' },
        { label: 'Teaching Jobs', to: '/jobs?q=Teaching' },
        { label: 'Banking Jobs', to: '/jobs?q=Banking' },
        { label: 'Defence Jobs', to: '/jobs?q=Defence' },
    ],
];

const LEGAL_LINKS = [
    { label: 'About Us', to: '/about' },
    { label: 'Contact Us', to: '/contact' },
    { label: 'Privacy Policy', to: '/privacy' },
    { label: 'Disclaimer', to: '/disclaimer' },
    { label: 'Advertise With Us', to: '/advertise' },
];

export function Footer() {
    return (
        <footer className="footer footer-expanded" data-testid="app-footer">
            <div className="container footer-inner">
                <section className="footer-social-zone">
                    <h3>Connect With Us</h3>
                    <div className="footer-social-grid">
                        {SOCIAL_LINKS.map((item) => (
                            <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className="footer-social-link">
                                {item.label}
                            </a>
                        ))}
                    </div>
                </section>

                <section className="footer-app-zone">
                    <h3>Download Our Apps</h3>
                    <div className="footer-app-buttons">
                        {APP_LINKS.map((item) => (
                            <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className="footer-app-btn">
                                {item.label}
                            </a>
                        ))}
                    </div>
                </section>

                <section className="footer-org-zone">
                    <h3>Quick Links by Organization</h3>
                    <div className="footer-org-grid">
                        {ORG_LINK_GROUPS.map((group, index) => (
                            <div key={`org-group-${index}`} className="footer-org-col">
                                {group.map((item) => (
                                    <Link key={item.label} to={item.to}>{item.label}</Link>
                                ))}
                            </div>
                        ))}
                    </div>
                </section>

                <section className="footer-bottom-expanded">
                    <div className="footer-brand-copy">
                        <p><strong>SarkariExams.me</strong> — Your trusted source for government job updates, results, and exam notifications.</p>
                        <p>Established: January 2026 | Trusted by aspirants across India.</p>
                    </div>

                    <nav className="footer-legal-links" aria-label="Footer legal links">
                        {LEGAL_LINKS.map((item) => (
                            <Link key={item.label} to={item.to}>{item.label}</Link>
                        ))}
                    </nav>

                    <div className="footer-copyright-expanded">
                        <p>© 2026-2027 SarkariExams.me — All Rights Reserved</p>
                        <p>Advertising queries: contact@sarkariexams.me</p>
                    </div>

                    <div className="footer-disclaimer-expanded">
                        <p>
                            <strong>Disclaimer:</strong> Examination results, marks, notifications, and related content on this website are provided for immediate informational use.
                            Users must verify all details from official authorities and notifications before acting.
                        </p>
                    </div>
                </section>
            </div>
        </footer>
    );
}

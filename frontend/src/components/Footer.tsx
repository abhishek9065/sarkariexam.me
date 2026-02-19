import { Link } from 'react-router-dom';

const SOCIAL_LINKS = [
    { label: 'Telegram', href: 'https://t.me/sarkariexamsme', icon: '✈️' },
    { label: 'WhatsApp', href: 'https://wa.me/sarkariexamsme', icon: '💬' },
    { label: 'YouTube', href: 'https://youtube.com/@sarkariexamsme', icon: '▶' },
    { label: 'Instagram', href: 'https://instagram.com/sarkariexamsme', icon: '📸' },
];

const FOOTER_LINKS = [
    { label: 'About', to: '/about' },
    { label: 'Contact', to: '/contact' },
    { label: 'Privacy Policy', to: '/privacy' },
    { label: 'Disclaimer', to: '/disclaimer' },
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

                    <div className="footer-social">
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

                <nav className="footer-nav" aria-label="Footer navigation">
                    {FOOTER_LINKS.map((item) => (
                        <Link key={item.label} to={item.to}>{item.label}</Link>
                    ))}
                    <Link to="/explore">Explore Organizations</Link>
                </nav>

                <div className="footer-bottom">
                    <p>© 2026 SarkariExams.me — All Rights Reserved</p>
                    <p className="footer-disclaimer">
                        <strong>Disclaimer:</strong> Content is for informational use only. Verify all details from official sources before acting.
                    </p>
                </div>
            </div>
        </footer>
    );
}

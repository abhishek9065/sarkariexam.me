import { Link } from 'react-router-dom';

export function Footer() {
    return (
        <footer className="footer">
            <div className="container footer-inner">
                <div className="footer-grid">
                    {/* Brand */}
                    <div className="footer-section">
                        <Link to="/" className="footer-brand">
                            <span className="header-logo-icon">📋</span>
                            <span className="header-logo-text">
                                Sarkari<span className="header-logo-accent">Exams</span>
                            </span>
                        </Link>
                        <p className="text-muted footer-tagline">
                            Your trusted source for government job updates, results, and exam notifications.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className="footer-section">
                        <h4 className="footer-heading">Quick Links</h4>
                        <nav className="footer-links">
                            <Link to="/jobs">Latest Jobs</Link>
                            <Link to="/results">Results</Link>
                            <Link to="/admit-card">Admit Cards</Link>
                            <Link to="/answer-key">Answer Keys</Link>
                        </nav>
                    </div>

                    {/* Info */}
                    <div className="footer-section">
                        <h4 className="footer-heading">Information</h4>
                        <nav className="footer-links">
                            <Link to="/about">About Us</Link>
                            <Link to="/contact">Contact</Link>
                            <Link to="/privacy">Privacy Policy</Link>
                            <Link to="/disclaimer">Disclaimer</Link>
                        </nav>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="footer-bottom">
                    <p>&copy; {new Date().getFullYear()} SarkariExams.me — All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}

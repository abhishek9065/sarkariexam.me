import { useNavigate } from 'react-router-dom';

interface FooterProps {
    setCurrentPage: (page: string) => void;
}

export function Footer({ setCurrentPage }: FooterProps) {
    const navigate = useNavigate();

    return (
        <footer className="site-footer">
            <div className="disclaimer-banner">
                <p><strong>Important Disclaimer:</strong> SarkariExams.me is an independent informational website. We are not affiliated with any government organization or official recruitment agency. All information is collected from publicly available sources.</p>
            </div>
            <div className="footer-content">
                <div className="footer-section">
                    <h4>Company Information</h4>
                    <p className="company-info">SarkariExams.me<br/>Independent Job Information Portal</p>
                    <button onClick={(e) => { e.preventDefault(); setCurrentPage('about'); }} className="footer-link">About Us</button>
                    <button onClick={(e) => { e.preventDefault(); setCurrentPage('contact'); }} className="footer-link">Contact Us</button>
                    <button onClick={(e) => { e.preventDefault(); setCurrentPage('privacy'); }} className="footer-link">Privacy Policy</button>
                    <button onClick={(e) => { e.preventDefault(); setCurrentPage('disclaimer'); }} className="footer-link">Disclaimer</button>
                </div>
                <div className="footer-section">
                    <h4>Information Sources</h4>
                    <p className="verification-info">All job notifications are aggregated from:</p>
                    <ul className="source-list">
                        <li>Official government websites</li>
                        <li>Public recruitment notifications</li>
                        <li>Verified educational portals</li>
                        <li>Official examination boards</li>
                    </ul>
                </div>
                <div className="footer-section">
                    <h4>Quick Access</h4>
                    <button onClick={() => navigate('/jobs')} className="footer-link">Latest Jobs</button>
                    <button onClick={() => navigate('/results')} className="footer-link">Results</button>
                    <button onClick={() => navigate('/admit-card')} className="footer-link">Admit Cards</button>
                    <button onClick={() => navigate('/answer-key')} className="footer-link">Answer Keys</button>
                </div>
            </div>
            <div className="footer-bottom">
                <p>© 2025-26 SarkariExams.me | <span className="version">Version 1.2.1</span> | Last Updated: January 25, 2026</p>
                <p className="legal-notice">⚠️ Always verify information from official sources before applying. We recommend checking original notifications for accuracy.</p>
            </div>
        </footer>
    );
}

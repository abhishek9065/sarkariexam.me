import type { PageType } from '../../utils/constants';

interface FooterProps {
    setCurrentPage: (page: PageType) => void;
}

export function Footer({ setCurrentPage }: FooterProps) {
    return (
        <footer className="site-footer">
            <div className="footer-content">
                <div className="footer-section">
                    <h4>Quick Links</h4>
                    <a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('about'); }}>About Us</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('contact'); }}>Contact Us</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('privacy'); }}>Privacy Policy</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('disclaimer'); }}>Disclaimer</a>
                </div>
                <div className="footer-section">
                    <h4>Follow Us</h4>
                    <a href="#">📱 WhatsApp</a>
                    <a href="#">✈️ Telegram</a>
                    <a href="#">🐦 Twitter</a>
                    <a href="#">📘 Facebook</a>
                </div>
                <div className="footer-section">
                    <h4>Categories</h4>
                    <a href="#">Latest Jobs</a>
                    <a href="#">Results</a>
                    <a href="#">Admit Cards</a>
                    <a href="#">Answer Keys</a>
                </div>
            </div>
            <div className="footer-bottom">
                <p>© 2024 SarkariExams.me. All Rights Reserved. (v1.2.1)</p>
                <p>This is an informational website. We are not affiliated with any government organization.</p>
            </div>
        </footer>
    );
}

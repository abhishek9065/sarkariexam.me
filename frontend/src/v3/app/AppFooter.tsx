import { Link } from 'react-router-dom';

export function AppFooter() {
    const year = new Date().getFullYear();

    return (
        <footer className="sr3-footer">
            <div className="sr3-shell sr3-footer-grid">
                <section className="sr3-footer-card sr3-surface">
                    <h2 className="sr3-section-title">About</h2>
                    <p className="sr3-section-subtitle">
                        SarkariExams.me publishes curated links to official notices, admit cards, and results.
                    </p>
                </section>

                <section className="sr3-footer-card sr3-surface">
                    <h2 className="sr3-section-title">Quick Links</h2>
                    <div className="sr3-footer-links">
                        <Link to="/about" className="sr3-inline-link">About</Link>
                        <Link to="/contact" className="sr3-inline-link">Contact</Link>
                        <Link to="/privacy" className="sr3-inline-link">Privacy</Link>
                        <Link to="/disclaimer" className="sr3-inline-link">Disclaimer</Link>
                    </div>
                </section>

                <section className="sr3-footer-card sr3-surface">
                    <h2 className="sr3-section-title">Trust Note</h2>
                    <p className="sr3-section-subtitle">
                        Always verify form dates, fees, and eligibility on official sources before submitting applications.
                    </p>
                </section>
            </div>
            <div className="sr3-shell sr3-footer-bottom">
                <span>Copyright {year} SarkariExams.me</span>
                <span>English v1</span>
            </div>
        </footer>
    );
}

export default AppFooter;

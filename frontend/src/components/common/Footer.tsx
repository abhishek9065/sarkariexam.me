import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContextStore';

interface FooterProps {
    setCurrentPage: (page: string) => void;
}

function getAcademicYearLabel(date = new Date()): string {
    const month = date.getMonth(); // 0-based
    const year = date.getFullYear();
    const startYear = month >= 3 ? year : year - 1;
    const endYearShort = String(startYear + 1).slice(-2);
    return `${startYear}-${endYearShort}`;
}

export function Footer({ setCurrentPage }: FooterProps) {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const lastUpdated = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const academicYear = getAcademicYearLabel();

    return (
        <footer className="site-footer v2-shell-footer">
            <div className="disclaimer-banner v2-shell-disclaimer">
                <p><strong>{t('footer.disclaimerTitle')}</strong> SarkariExams.me is an independent informational website. We are not affiliated with any government organization or official recruitment agency. All information is collected from publicly available sources.</p>
            </div>
            <div className="footer-content v2-shell-footer-content">
                <div className="footer-section v2-shell-footer-section">
                    <h4>{t('footer.company')}</h4>
                    <p className="company-info">SarkariExams.me<br/>Independent Job Information Portal</p>
                    <button onClick={(e) => { e.preventDefault(); setCurrentPage('about'); }} className="footer-link">{t('footer.about')}</button>
                    <button onClick={(e) => { e.preventDefault(); setCurrentPage('contact'); }} className="footer-link">{t('footer.contact')}</button>
                    <button onClick={(e) => { e.preventDefault(); setCurrentPage('privacy'); }} className="footer-link">{t('footer.privacy')}</button>
                    <button onClick={(e) => { e.preventDefault(); setCurrentPage('disclaimer'); }} className="footer-link">{t('footer.disclaimer')}</button>
                </div>
                <div className="footer-section v2-shell-footer-section">
                    <h4>{t('footer.sources')}</h4>
                    <p className="verification-info">All job notifications are aggregated from:</p>
                    <ul className="source-list">
                        <li>Official government websites</li>
                        <li>Public recruitment notifications</li>
                        <li>Verified educational portals</li>
                        <li>Official examination boards</li>
                    </ul>
                </div>
                <div className="footer-section v2-shell-footer-section">
                    <h4>{t('footer.quickAccess')}</h4>
                    <button onClick={() => navigate('/jobs')} className="footer-link">{t('footer.latestJobs')}</button>
                    <button onClick={() => navigate('/results')} className="footer-link">{t('footer.results')}</button>
                    <button onClick={() => navigate('/admit-card')} className="footer-link">{t('footer.admit')}</button>
                    <button onClick={() => navigate('/answer-key')} className="footer-link">{t('footer.answer')}</button>
                </div>
            </div>
            <div className="footer-bottom v2-shell-footer-bottom">
                <p>© {academicYear} SarkariExams.me | <span className="version">Version 1.2.1</span> | Last Updated: {lastUpdated}</p>
                <p className="legal-notice">⚠️ {t('footer.legalNotice')}</p>
            </div>
        </footer>
    );
}

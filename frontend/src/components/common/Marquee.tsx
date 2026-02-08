function getAcademicYearLabel(date = new Date()): string {
    const month = date.getMonth(); // 0-based
    const year = date.getFullYear();
    const startYear = month >= 3 ? year : year - 1;
    const endYearShort = String(startYear + 1).slice(-2);
    return `${startYear}-${endYearShort}`;
}

export function Marquee() {
    const academicYear = getAcademicYearLabel();

    return (
        <div className="marquee-container" role="banner" aria-label="Latest updates ticker">
            <span className="live-badge" aria-label="Live updates">
                <span className="live-indicator"></span>
                <span>LIVE UPDATES</span>
            </span>
            <div className="marquee-track">
                <div className="marquee-content">
                    <span className="marquee-item">🎓 SarkariExams.me - Academic Year {academicYear}</span>
                    <span className="marquee-item">📋 Latest UPSC and SSC notifications updated from official sources</span>
                    <span className="marquee-item">🚂 Railway and Banking updates are refreshed regularly</span>
                    <span className="marquee-item">🎫 Admit cards, answer keys, and results listed category-wise</span>
                    <span className="marquee-item">⚠️ Verify eligibility and deadlines on official websites before applying</span>
                </div>
            </div>
        </div>
    );
}

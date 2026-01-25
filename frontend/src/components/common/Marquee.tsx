export function Marquee() {
    return (
        <div className="marquee-container" role="banner" aria-label="Latest updates ticker">
            <span className="live-badge" aria-label="Live updates">
                <span className="live-indicator"></span>
                <span>LIVE UPDATES</span>
            </span>
            <div className="marquee-track">
                <div className="marquee-content">
                    <span className="marquee-item">🎓 SarkariExams.me - Academic Year 2025-26</span>
                    <span className="marquee-item">📋 UPSC CSE 2025 Final Result - Check Official Website</span>
                    <span className="marquee-item">🏦 SSC CHSL 2024 Tier 1 Result - Check Official Website</span>
                    <span className="marquee-item">🚂 Railway RRB Group D 2024 Results - Check Official Website</span>
                    <span className="marquee-item">💼 Banking PO/Clerk 2024 Admit Cards - Check Official Website</span>
                </div>
            </div>
        </div>
    );
}

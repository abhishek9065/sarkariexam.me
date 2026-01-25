export function Marquee() {
    return (
        <div className="marquee-container" role="banner" aria-label="Latest updates ticker">
            <span className="live-badge" aria-label="Live updates">
                <span className="live-indicator"></span>
                <span>LIVE UPDATES</span>
            </span>
            <div className="marquee-track">
                <div className="marquee-content">
                    <span className="marquee-item">Welcome to SarkariExams.me - Government Job Information Portal for Academic Year 2025-26</span>
                    <span className="marquee-item">UPSC CSE 2024 Final Result Published - Check Official Website</span>
                    <span className="marquee-item">SSC CHSL 2024 Tier 1 Result Available - Direct Official Link Provided</span>
                    <span className="marquee-item">Railway RRB Group D 2024 Results Released - Verify from Official Source</span>
                    <span className="marquee-item">Banking PO/Clerk 2024 Admit Cards Available - Download from Bank Websites</span>
                </div>
            </div>
        </div>
    );
}

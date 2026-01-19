export function SkeletonLoader() {
    const SkeletonCard = () => (
        <div className="skeleton-card">
            <div className="skeleton-header"></div>
            <div className="skeleton-content">
                <div className="skeleton-line"></div>
                <div className="skeleton-line"></div>
                <div className="skeleton-line"></div>
                <div className="skeleton-line"></div>
                <div className="skeleton-line"></div>
                <div className="skeleton-line"></div>
                <div className="skeleton-line"></div>
                <div className="skeleton-line"></div>
            </div>
            <div className="skeleton-footer">
                <div className="skeleton-button"></div>
            </div>
        </div>
    );

    return (
        <>
            <div className="skeleton-grid">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>
            <div className="skeleton-grid">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>
        </>
    );
}

type OpsSkeletonProps = {
    lines?: number;
};

export function OpsSkeleton({ lines = 4 }: OpsSkeletonProps) {
    return (
        <div className="ops-card muted" aria-live="polite" aria-busy="true">
            <div className="ops-stack">
                {Array.from({ length: lines }).map((_, index) => (
                    <div key={`skeleton-${index}`} className="admin-alert info">
                        Loading...
                    </div>
                ))}
            </div>
        </div>
    );
}

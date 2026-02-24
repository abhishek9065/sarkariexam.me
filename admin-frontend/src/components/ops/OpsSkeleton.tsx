type OpsSkeletonProps = {
    lines?: number;
    variant?: 'card' | 'table' | 'kpi';
};

export function OpsSkeleton({ lines = 4, variant = 'card' }: OpsSkeletonProps) {
    if (variant === 'kpi') {
        return (
            <div className="ops-skeleton-kpi-grid" aria-live="polite" aria-busy="true">
                {Array.from({ length: lines }).map((_, i) => (
                    <div key={`skel-kpi-${i}`} className="ops-skeleton-kpi">
                        <div className="ops-skeleton-shimmer ops-skeleton-line short" />
                        <div className="ops-skeleton-shimmer ops-skeleton-line large" />
                        <div className="ops-skeleton-shimmer ops-skeleton-line tiny" />
                    </div>
                ))}
            </div>
        );
    }

    if (variant === 'table') {
        return (
            <div className="ops-skeleton-table-wrap" aria-live="polite" aria-busy="true">
                <div className="ops-skeleton-shimmer ops-skeleton-line header" />
                {Array.from({ length: lines }).map((_, i) => (
                    <div key={`skel-row-${i}`} className="ops-skeleton-table-row">
                        <div className="ops-skeleton-shimmer ops-skeleton-line medium" />
                        <div className="ops-skeleton-shimmer ops-skeleton-line short" />
                        <div className="ops-skeleton-shimmer ops-skeleton-line tiny" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="ops-skeleton-card" aria-live="polite" aria-busy="true">
            <div className="ops-skeleton-shimmer ops-skeleton-line medium" />
            <div className="ops-skeleton-shimmer ops-skeleton-line short" />
            <div className="ops-skeleton-spacer" />
            {Array.from({ length: lines }).map((_, i) => (
                <div key={`skel-line-${i}`} className="ops-skeleton-shimmer ops-skeleton-line full" />
            ))}
        </div>
    );
}

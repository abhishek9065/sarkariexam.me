export function SkeletonLoader() {
    return (
        <div className="skeleton-page">
            {/* Header skeleton */}
            <div className="skeleton" style={{ height: 20, width: '40%', marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 14, width: '70%', marginBottom: 24 }} />

            {/* Card skeletons */}
            <div className="grid-auto">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="card" style={{ padding: 16 }}>
                        <div className="skeleton" style={{ height: 16, width: '80%', marginBottom: 12 }} />
                        <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 8 }} />
                        <div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 8 }} />
                        <div className="skeleton" style={{ height: 28, width: '30%', marginTop: 12 }} />
                    </div>
                ))}
            </div>
        </div>
    );
}

import './AdminSkeleton.css';

interface AdminSkeletonProps {
    type?: 'table' | 'cards' | 'form';
    rows?: number;
}

export function AdminSkeleton({ type = 'table', rows = 5 }: AdminSkeletonProps) {
    if (type === 'cards') {
        return (
            <div className="skeleton-cards">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="skeleton-card">
                        <div className="skeleton-line title" />
                        <div className="skeleton-line" />
                        <div className="skeleton-line short" />
                    </div>
                ))}
            </div>
        );
    }

    if (type === 'form') {
        return (
            <div className="skeleton-form">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="skeleton-field">
                        <div className="skeleton-line label" />
                        <div className="skeleton-line input" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="skeleton-table">
            <div className="skeleton-table-header">
                <div className="skeleton-line" />
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="skeleton-table-row">
                    <div className="skeleton-line checkbox" />
                    <div className="skeleton-line title" />
                    <div className="skeleton-line short" />
                    <div className="skeleton-line short" />
                    <div className="skeleton-line actions" />
                </div>
            ))}
        </div>
    );
}

export default AdminSkeleton;

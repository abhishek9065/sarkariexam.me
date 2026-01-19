import type { Announcement } from '../../types';

interface SectionTableProps {
    title: string;
    items: Announcement[];
    onViewMore?: () => void;
    onItemClick: (item: Announcement) => void;
    fullWidth?: boolean;
}

// Generate consistent color from organization name
const getOrgColor = (org: string): string => {
    const colors = [
        '#DC2626', '#D97706', '#059669', '#0891B2',
        '#2563EB', '#7C3AED', '#DB2777', '#4F46E5'
    ];
    let hash = 0;
    for (let i = 0; i < org.length; i++) {
        hash = org.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

// Get initials from organization name
const getInitials = (org: string): string => {
    const words = org.split(' ').filter(w => w.length > 0);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
};

export function SectionTable({ title, items, onViewMore, onItemClick, fullWidth }: SectionTableProps) {
    const formatShortDate = (date: string | undefined) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    };

    return (
        <div className="section-table" style={fullWidth ? { gridColumn: '1 / -1' } : undefined}>
            <div className="section-table-header">{title}</div>
            <div className="section-table-content">
                <ul>
                    {items.length > 0 ? (
                        items.slice(0, 20).map((item) => (
                            <li key={item.id} className="section-item">
                                {/* Organization Logo/Initial */}
                                {item.organization && (
                                    <span
                                        className="org-badge"
                                        style={{ backgroundColor: getOrgColor(item.organization) }}
                                        title={item.organization}
                                    >
                                        {getInitials(item.organization)}
                                    </span>
                                )}
                                <a href="#" onClick={(e) => { e.preventDefault(); onItemClick(item); }}>
                                    <span className="item-org">{item.organization}</span>
                                    <span className="item-title">{item.title}</span>
                                    {item.totalPosts && <span className="item-posts">{item.totalPosts} Post</span>}
                                </a>
                                <div className="item-meta">
                                    {item.deadline && (
                                        <span className="item-date">{formatShortDate(item.deadline)}</span>
                                    )}
                                    {item.viewCount > 100 && (
                                        <span className="item-views" title={`${item.viewCount} views`}>
                                            🔥 {item.viewCount > 1000 ? `${(item.viewCount / 1000).toFixed(1)}k` : item.viewCount}
                                        </span>
                                    )}
                                </div>
                            </li>
                        ))
                    ) : (
                        <li className="no-items">No {title.toLowerCase()} available at the moment.</li>
                    )}
                </ul>
            </div>
            {onViewMore && (
                <div className="section-table-footer">
                    <button className="view-more-btn" onClick={onViewMore}>View More</button>
                </div>
            )}
        </div>
    );
}

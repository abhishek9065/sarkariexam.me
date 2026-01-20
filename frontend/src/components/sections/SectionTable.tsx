import type { Announcement } from '../../types';

interface SectionTableProps {
    title: string;
    items: Announcement[];
    onViewMore?: () => void;
    onItemClick: (item: Announcement) => void;
    fullWidth?: boolean;
}

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
                        items.slice(0, 10).map((item) => (
                            <li key={item.id} className="section-item">
                                <a href="#" onClick={(e) => { e.preventDefault(); onItemClick(item); }}>
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

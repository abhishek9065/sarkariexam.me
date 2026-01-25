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
        const d = new Date(date);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
    };

    const getTimestampDisplay = (item: Announcement) => {
        if (item.deadline && new Date(item.deadline) > new Date()) {
            return `Deadline: ${formatShortDate(item.deadline)}`;
        }
        if (item.updatedAt) {
            return `Updated: ${formatShortDate(item.updatedAt)}`;
        }
        if (item.createdAt) {
            return `Posted: ${formatShortDate(item.createdAt)}`;
        }
        return '';
    };

    return (
        <div className="section-table" style={fullWidth ? { gridColumn: '1 / -1' } : undefined}>
            <div className="section-table-header">{title}</div>
            <div className="section-table-content">
                <ul>
                    {items.length > 0 ? (
                        items.slice(0, 10).map((item) => (
                            <li key={item.id} className="section-item">
                                <a href={`/${item.type}/${item.slug}`} onClick={(e) => { e.preventDefault(); onItemClick(item); }}>
                                    <span className="item-title">{item.title}</span>
                                    {item.totalPosts && <span className="item-posts">{item.totalPosts} Post</span>}
                                </a>
                                <div className="item-meta">
                                    <span className="item-timestamp" title="Last updated information">
                                        📅 {getTimestampDisplay(item)}
                                    </span>
                                    {item.organization && (
                                        <span className="item-org" title={`Recruiting organization: ${item.organization}`}>
                                            🏛️ {item.organization}
                                        </span>
                                    )}
                                    <span className="item-source" title="Information sourced from official notifications">
                                        ✓ Official Source
                                    </span>
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

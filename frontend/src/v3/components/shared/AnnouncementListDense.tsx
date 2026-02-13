import { Link } from 'react-router-dom';
import { formatDate } from '../../../utils';
import type { Announcement } from '../../../types';

interface AnnouncementListDenseProps {
    title: string;
    subtitle?: string;
    items: Announcement[];
    limit?: number;
    emptyText?: string;
    showTypeBadge?: boolean;
    onCompareAdd?: (item: Announcement) => void;
    onTrackToggle?: (item: Announcement) => void;
    trackedSlugs?: Set<string>;
    footerLink?: { label: string; to: string };
}

export function AnnouncementListDense({
    title,
    subtitle,
    items,
    limit = 20,
    emptyText = 'No records found.',
    showTypeBadge = false,
    onCompareAdd,
    onTrackToggle,
    trackedSlugs,
    footerLink,
}: AnnouncementListDenseProps) {
    const visibleItems = items.slice(0, limit);

    return (
        <section className="sr3-surface sr3-dense-list">
            <header className="sr3-card-head">
                <div>
                    <h2 className="sr3-section-title">{title}</h2>
                    {subtitle && <p className="sr3-section-subtitle">{subtitle}</p>}
                </div>
            </header>

            {visibleItems.length === 0 && <p className="sr3-empty">{emptyText}</p>}

            {visibleItems.length > 0 && (
                <ol className="sr3-dense-items">
                    {visibleItems.map((item) => {
                        const isTracked = trackedSlugs?.has(item.slug) ?? false;
                        return (
                            <li key={item.id || item.slug} className="sr3-dense-item">
                                <div className="sr3-dense-main">
                                    <Link to={`/${item.type}/${item.slug}`} className="sr3-dense-link">
                                        {item.title}
                                    </Link>
                                    <div className="sr3-dense-meta">
                                        <span>{item.organization || 'Government'}</span>
                                        {item.deadline && <span>Deadline: {formatDate(item.deadline)}</span>}
                                        {showTypeBadge && <span className="sr3-badge blue">{item.type}</span>}
                                    </div>
                                </div>

                                <div className="sr3-dense-actions">
                                    {onTrackToggle && (
                                        <button type="button" className="sr3-btn secondary" onClick={() => onTrackToggle(item)}>
                                            {isTracked ? 'Untrack' : 'Track'}
                                        </button>
                                    )}
                                    {onCompareAdd && item.type === 'job' && (
                                        <button type="button" className="sr3-btn secondary" onClick={() => onCompareAdd(item)}>
                                            Compare
                                        </button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}

            {footerLink && (
                <footer className="sr3-card-foot">
                    <Link to={footerLink.to} className="sr3-inline-link">{footerLink.label}</Link>
                </footer>
            )}
        </section>
    );
}

export default AnnouncementListDense;
